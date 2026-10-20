from datetime import datetime
import json
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.db.seed import create_worker_account
from app.models.proposal import Proposal
from app.models.worker import WorkerProfile
from app.repositories.proposal_repository import ProposalRepository
from app.schemas.proposal_schema import (
    ProposalCreateRequest,
    SaveEvaluationsRequest,
    SendReportRequest,
)


def serialize_worker(w: WorkerProfile) -> dict:
    return {
        "id": w.id,
        "user_id": w.user_id,
        "proposal_id": w.proposal_id,
        "first_name": w.first_name,
        "last_name": w.last_name,
        "full_name": f"{w.first_name} {w.last_name}",
        "dni": w.dni,
        "email": w.email,
        "position": w.position,
        "generated_username": w.generated_username or (f"op.{w.dni}" if w.user_id else None),
        "generated_password": w.generated_password or (f"mina{w.dni[-4:]}" if w.user_id else None),
        "exam_score": w.exam_score,
        "exam_attempts": w.exam_attempts,
        "exam_passed": w.exam_passed,
        "medical_cert_filename": w.medical_cert_filename,
        "medical_cert_url": w.medical_cert_url,
        "medical_cert_status": w.medical_cert_status,
        "medical_ai_feedback": w.medical_ai_feedback,
        "is_authorized": w.is_authorized,
        "mala_conducta": w.mala_conducta,
        "mal_trabajo": w.mal_trabajo,
        "no_lleva_epps": w.no_lleva_epps,
        "faltas_epp_count": w.faltas_epp_count,
        "observaciones": w.observaciones or "",
        "qr_payload": json.dumps(
            {
                "app": "SAFEMINE_AI",
                "worker_id": w.id,
                "dni": w.dni,
                "name": f"{w.first_name} {w.last_name}",
            }
        ),
    }


def serialize_proposal(p: Proposal) -> dict:
    try:
        epps = json.loads(p.required_epps)
    except Exception:
        epps = ["HEAD_COVER", "HAND_COVER", "FACE_COVER"]

    workers_list = [serialize_worker(w) for w in p.workers]
    authorized_count = sum(1 for w in workers_list if w["is_authorized"])
    incident_workers = sum(
        1
        for w in workers_list
        if w["mala_conducta"] or w["mal_trabajo"] or w["no_lleva_epps"]
    )

    return {
        "id": p.id,
        "title": p.title,
        "description": p.description,
        "quota": p.quota,
        "start_date": p.start_date,
        "required_epps": epps,
        "status": p.status,
        "provider_id": p.provider_id,
        "provider_company_name": p.provider_company_name,
        "report_sent": p.report_sent,
        "report_sent_at": p.report_sent_at,
        "report_summary": p.report_summary,
        "workers_count": len(workers_list),
        "authorized_count": authorized_count,
        "incident_workers_count": incident_workers,
        "workers": workers_list,
    }


class MineraService:
    @staticmethod
    def list_proposals(db: Session) -> dict:
        proposals = ProposalRepository.list_all(db)
        return {"proposals": [serialize_proposal(p) for p in proposals]}

    @staticmethod
    def create_proposal(db: Session, req: ProposalCreateRequest) -> dict:
        proposal = Proposal(
            title=req.title.strip(),
            description=req.description.strip(),
            quota=req.quota,
            start_date=req.start_date,
            required_epps=json.dumps(req.required_epps),
            status="ABIERTA",
        )
        created = ProposalRepository.create(db, proposal)
        return {
            "message": "Convocatoria creada exitosamente.",
            "proposal": serialize_proposal(created),
        }

    @staticmethod
    def accept_proposal_and_generate_accounts(db: Session, proposal_id: int) -> dict:
        proposal = ProposalRepository.get_by_id(db, proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Propuesta no encontrada.")

        if len(proposal.workers) == 0:
            raise HTTPException(
                status_code=400,
                detail="Esta propuesta aún no tiene trabajadores postulados.",
            )

        proposal.status = "ACEPTADA"
        generated_credentials = []

        for worker in proposal.workers:
            user_acc = create_worker_account(db, worker)
            generated_credentials.append(
                {
                    "worker_id": worker.id,
                    "full_name": f"{worker.first_name} {worker.last_name}",
                    "dni": worker.dni,
                    "username": worker.generated_username or user_acc.username,
                    "password": worker.generated_password or user_acc.plain_password_hint,
                    "email": worker.email,
                }
            )

        db.commit()
        db.refresh(proposal)

        return {
            "message": f"Propuesta ACEPTADA. Se crearon automáticamente {len(generated_credentials)} cuentas de trabajador.",
            "generated_credentials": generated_credentials,
            "proposal": serialize_proposal(proposal),
        }

    @staticmethod
    def save_evaluations(
        db: Session, proposal_id: int, req: SaveEvaluationsRequest
    ) -> dict:
        proposal = ProposalRepository.get_by_id(db, proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Propuesta no encontrada.")

        eval_map = {item.worker_id: item for item in req.evaluations}
        for worker in proposal.workers:
            if worker.id in eval_map:
                ev = eval_map[worker.id]
                worker.mala_conducta = ev.mala_conducta
                worker.mal_trabajo = ev.mal_trabajo
                worker.no_lleva_epps = ev.no_lleva_epps
                worker.observaciones = ev.observaciones

        db.commit()
        db.refresh(proposal)
        return {
            "message": "Calificaciones de desempeño guardadas correctamente.",
            "proposal": serialize_proposal(proposal),
        }

    @staticmethod
    def send_report_to_provider(
        db: Session, proposal_id: int, req: SendReportRequest
    ) -> dict:
        proposal = ProposalRepository.get_by_id(db, proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Propuesta no encontrada.")

        total = len(proposal.workers)
        with_incidents = sum(
            1
            for w in proposal.workers
            if w.mala_conducta or w.mal_trabajo or w.no_lleva_epps
        )
        optimal = total - with_incidents

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        proposal.report_sent = True
        proposal.report_sent_at = now_str
        proposal.report_summary = req.report_summary or (
            f"Reporte oficial emitido el {now_str}: {optimal}/{total} trabajadores con desempeño óptimo y "
            f"{with_incidents}/{total} con incidencias registradas."
        )

        db.commit()
        db.refresh(proposal)
        return {
            "message": "Reporte de evaluación registrado y enviado al portal del Proveedor.",
            "proposal": serialize_proposal(proposal),
        }
