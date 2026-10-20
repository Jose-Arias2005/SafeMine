from datetime import datetime
import json
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.core.ws_manager import ws_manager
from app.db.session import get_db
from app.models.access_log import AccessLog
from app.repositories.access_log_repository import AccessLogRepository
from app.repositories.worker_repository import WorkerRepository
from app.schemas.kiosco_schema import VerifyQRRequest
from app.services.aws_service import verify_epp_with_rekognition
from app.services.minera_service import serialize_worker

router = APIRouter(
    prefix="/api/vision",
    tags=["Módulo 4: Kiosco / Cámara en Garita + Rekognition + Arduino"],
)


@router.post("/verify-qr")
async def verify_worker_qr(req: VerifyQRRequest, db: Session = Depends(get_db)):
    raw = req.qr_data.strip()
    worker = None

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            w_id = parsed.get("worker_id")
            dni = parsed.get("dni")
            if w_id:
                worker = WorkerRepository.get_by_id(db, int(w_id))
            if not worker and dni:
                worker = WorkerRepository.get_by_dni(db, str(dni))
    except Exception:
        pass

    if not worker:
        worker = WorkerRepository.get_by_dni(db, raw)
        if not worker and raw.isdigit():
            worker = WorkerRepository.get_by_id(db, int(raw))

    if not worker:
        ws_payload = {
            "event": "GATE_UPDATE",
            "phase": "FASE_1_QR",
            "status": "ROJO",
            "worker_id": None,
            "worker_name": "Desconocido (QR No Registrado)",
            "faltante": ["Credencial QR no existe en el padrón"],
            "message": "ACCESO DENEGADO: Código QR no reconocido.",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
        }
        await ws_manager.broadcast(ws_payload)
        raise HTTPException(
            status_code=404,
            detail="Código QR no corresponde a ningún trabajador registrado.",
        )

    full_name = f"{worker.first_name} {worker.last_name}"

    if not worker.is_authorized:
        reasons = []
        if not worker.exam_passed or worker.exam_score < 80:
            reasons.append(
                f"Examen de inducción no aprobado ({worker.exam_score}/100, mínimo 80)"
            )
        if worker.medical_cert_status != "VALIDADA_POR_IA":
            reasons.append(f"Constancia médica ({worker.medical_cert_status})")

        reason_str = " | ".join(reasons) or "No cumple requisitos de acreditación"

        AccessLogRepository.create(
            db,
            AccessLog(
                worker_id=worker.id,
                worker_name=full_name,
                worker_dni=worker.dni,
                phase="FASE_1_QR",
                status="ROJO",
                detected_epps="[]",
                missing_epps=json.dumps(reasons),
                message=f"Rechazado en Fase 1 (QR): Trabajador NO AUTORIZADO — {reason_str}",
            ),
        )

        ws_payload = {
            "event": "GATE_UPDATE",
            "phase": "FASE_1_QR",
            "status": "ROJO",
            "worker_id": worker.id,
            "worker_name": full_name,
            "dni": worker.dni,
            "faltante": reasons,
            "message": f"ACCESO DENEGADO EN FASE 1: {full_name} NO ESTÁ AUTORIZADO ({reason_str})",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
        }
        await ws_manager.broadcast(ws_payload)

        return {
            "authorized": False,
            "status": "ROJO",
            "message": ws_payload["message"],
            "reasons": reasons,
            "worker": serialize_worker(worker),
        }

    serialized = serialize_worker(worker)
    ws_manager.last_scanned_worker = serialized

    ws_payload = {
        "event": "QR_AUTHORIZED",
        "phase": "FASE_1_QR",
        "status": "QR_OK",
        "worker_id": worker.id,
        "worker_name": full_name,
        "dni": worker.dni,
        "message": f"QR Válido: {full_name} AUTORIZADO. Iniciando Fase 2: Verificación de EPPs en Cámara.",
        "timestamp": datetime.now().strftime("%H:%M:%S"),
    }
    await ws_manager.broadcast(ws_payload)

    return {
        "authorized": True,
        "status": "QR_OK",
        "message": ws_payload["message"],
        "worker": serialized,
    }


@router.post("/verify-epp")
async def verify_worker_epp(
    worker_id: Optional[int] = Form(None),
    simulate_mode: Optional[str] = Form(None),
    frame: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    target_worker_id = worker_id or (
        ws_manager.last_scanned_worker.get("id")
        if ws_manager.last_scanned_worker
        else None
    )
    if not target_worker_id:
        raise HTTPException(
            status_code=400,
            detail="No hay ningún trabajador fijado en Fase 1. Escanee primero el Código QR del trabajador.",
        )

    worker = WorkerRepository.get_by_id(db, int(target_worker_id))
    if not worker:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado.")

    required_epps = ["HEAD_COVER", "HAND_COVER", "FACE_COVER"]
    if worker.proposal and worker.proposal.required_epps:
        try:
            required_epps = json.loads(worker.proposal.required_epps)
        except Exception:
            pass

    image_bytes = await frame.read() if frame else None

    epp_result = verify_epp_with_rekognition(
        image_bytes=image_bytes,
        required_epps=required_epps,
        simulate_mode=simulate_mode,
    )

    full_name = f"{worker.first_name} {worker.last_name}"
    now_str = datetime.now().strftime("%H:%M:%S")

    if epp_result["all_epp_present"]:
        status = "VERDE"
        msg = f"ACCESO CONCEDIDO: {full_name} cuenta con todos sus EPPs obligatorios."
    else:
        status = "ROJO"
        missing_str = ", ".join(epp_result["missing_epps"])
        msg = (
            f"ACCESO DENEGADO — FALTA EPP ({missing_str}). "
            f"Se marcó automáticamente 'No lleva sus EPPs' en la ficha de {full_name}."
        )
        worker.no_lleva_epps = True
        worker.faltas_epp_count = (worker.faltas_epp_count or 0) + 1
        auto_note = (
            f"[Auto-Cámara Garita {now_str}] Incumplimiento de EPP detectado: falta {missing_str}."
        )
        if worker.observaciones:
            if auto_note not in worker.observaciones:
                worker.observaciones = f"{worker.observaciones} | {auto_note}"
        else:
            worker.observaciones = auto_note

    AccessLogRepository.create(
        db,
        AccessLog(
            worker_id=worker.id,
            worker_name=full_name,
            worker_dni=worker.dni,
            phase="FASE_2_EPP",
            status=status,
            detected_epps=json.dumps(epp_result["detected_epps"]),
            missing_epps=json.dumps(epp_result["missing_epps"]),
            message=msg,
        ),
    )
    db.refresh(worker)

    ws_payload = {
        "event": "GATE_UPDATE",
        "phase": "FASE_2_EPP",
        "status": status,
        "worker_id": worker.id,
        "worker_name": full_name,
        "dni": worker.dni,
        "detectado": epp_result["detected_epps"],
        "faltante": epp_result["missing_epps"],
        "no_lleva_epps": worker.no_lleva_epps,
        "faltas_epp_count": worker.faltas_epp_count,
        "mode": epp_result["mode"],
        "message": msg,
        "timestamp": now_str,
    }
    await ws_manager.broadcast(ws_payload)

    return {
        "status": status,
        "all_epp_present": epp_result["all_epp_present"],
        "detected_epps": epp_result["detected_epps"],
        "missing_epps": epp_result["missing_epps"],
        "mode": epp_result["mode"],
        "confidence_summary": epp_result["confidence_summary"],
        "message": msg,
        "worker": serialize_worker(worker),
    }


@router.get("/logs")
def get_access_logs(db: Session = Depends(get_db)):
    logs = AccessLogRepository.list_recent(db, limit=25)
    return {
        "last_scanned_worker": ws_manager.last_scanned_worker,
        "last_gate_event": ws_manager.last_gate_event,
        "logs": [
            {
                "id": l.id,
                "worker_id": l.worker_id,
                "worker_name": l.worker_name,
                "worker_dni": l.worker_dni,
                "phase": l.phase,
                "status": l.status,
                "detected_epps": json.loads(l.detected_epps or "[]"),
                "missing_epps": json.loads(l.missing_epps or "[]"),
                "message": l.message,
                "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S")
                if l.timestamp
                else "",
            }
            for l in logs
        ],
    }
