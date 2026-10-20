import json
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.models.worker import WorkerProfile
from app.repositories.worker_repository import WorkerRepository
from app.schemas.worker_schema import ExamSubmitRequest
from app.services.aws_service import upload_document_to_storage
from app.services.gemini_service import validate_medical_certificate_with_gemini
from app.services.minera_service import serialize_worker

SAFETY_EXAM_QUESTIONS = [
    {
        "id": 1,
        "question": "1. ¿Cuál es el equipo de protección personal (EPP) obligatorio para ingresar a la zona operativa de Planta y Mina?",
        "options": [
            "Solo chaleco reflectivo",
            "Casco de seguridad con barbiquejo, guantes de seguridad, lentes/protección facial y botas con punta de acero",
            "Gorra común y guantes de tela únicamente",
            "El EPP es opcional en turnos cortos",
        ],
        "correct_index": 1,
    },
    {
        "id": 2,
        "question": "2. ¿Qué herramienta de gestión de seguridad se debe elaborar obligatoriamente ANTES de iniciar cualquier tarea en mina?",
        "options": [
            "Solo firmar asistencia a la salida del turno",
            "IPERC Continuo (Identificación de Peligros, Evaluación de Riesgos y Medidas de Control) y PETAR si es alto riesgo",
            "Ninguna si el trabajador tiene más de 1 año de experiencia",
            "Pedir autorización verbal a un compañero",
        ],
        "correct_index": 1,
    },
    {
        "id": 3,
        "question": "3. Si durante el control en Garita con cámara IA se detecta que NO llevas tus EPPs completos, ¿qué sucede según el reglamento SafeMine?",
        "options": [
            "Se permite el ingreso con una advertencia verbal",
            "Se activa la alerta ROJA en garita, se deniega el acceso físico y se registra automáticamente la falta en tu ficha de evaluación",
            "Solo se descuenta 5 minutos de refrigerio",
            "El sistema ignora la falta si llevas tu fotocheck QR",
        ],
        "correct_index": 1,
    },
    {
        "id": 4,
        "question": "4. En trabajos de mantenimiento eléctrico o mecánico en molinos/chancadoras, ¿qué procedimiento garantiza que el equipo no arranque accidentalmente?",
        "options": [
            "Avisar por radio que no prendan la máquina",
            "Bloqueo y Etiquetado (LOTOTO - Lockout / Tagout / Tryout) con candado personal y prueba de energía cero",
            "Apagar solo el interruptor de iluminación",
            "Dejar una señal de cartón cerca del tablero",
        ],
        "correct_index": 1,
    },
    {
        "id": 5,
        "question": "5. ¿Cuál es la nota mínima obligatoria en esta evaluación de inducción y el requisito médico para desbloquear tu Fotocheck QR de ingreso?",
        "options": [
            "Nota mínima 50/100 y declaración jurada simple",
            "Nota mínima 80/100 (>= 80%) y Constancia Médica Ocupacional validada como APTO por IA",
            "Nota mínima 60/100 sin examen médico",
            "Basta con estar en la lista del proveedor",
        ],
        "correct_index": 1,
    },
]


def refresh_worker_authorization(worker: WorkerProfile):
    worker.is_authorized = bool(
        worker.exam_passed
        and worker.exam_score >= 80
        and worker.medical_cert_status == "VALIDADA_POR_IA"
    )


class TrabajadorService:
    @staticmethod
    def get_exam_questions() -> dict:
        return {"questions": SAFETY_EXAM_QUESTIONS, "passing_score": 80}

    @staticmethod
    def list_workers(db: Session) -> dict:
        workers = WorkerRepository.list_all(db)
        return {
            "workers": [
                {
                    **serialize_worker(w),
                    "proposal_title": w.proposal.title if w.proposal else "",
                    "proposal_status": w.proposal.status if w.proposal else "",
                }
                for w in workers
            ]
        }

    @staticmethod
    def get_worker_detail(db: Session, worker_id: int) -> dict:
        worker = WorkerRepository.get_by_id(db, worker_id)
        if not worker:
            raise HTTPException(status_code=404, detail="Trabajador no encontrado.")

        return {
            "worker": serialize_worker(worker),
            "proposal": {
                "id": worker.proposal.id,
                "title": worker.proposal.title,
                "start_date": worker.proposal.start_date,
                "provider_company_name": worker.proposal.provider_company_name,
                "required_epps": json.loads(worker.proposal.required_epps)
                if worker.proposal and worker.proposal.required_epps
                else ["HEAD_COVER", "HAND_COVER", "FACE_COVER"],
            }
            if worker.proposal
            else None,
        }

    @staticmethod
    def submit_exam(db: Session, worker_id: int, req: ExamSubmitRequest) -> dict:
        worker = WorkerRepository.get_by_id(db, worker_id)
        if not worker:
            raise HTTPException(status_code=404, detail="Trabajador no encontrado.")

        if req.score_override is not None:
            score = max(0, min(100, req.score_override))
        else:
            correct_count = 0
            for idx, question in enumerate(SAFETY_EXAM_QUESTIONS):
                if idx < len(req.answers) and req.answers[idx] == question["correct_index"]:
                    correct_count += 1
            score = int((correct_count / len(SAFETY_EXAM_QUESTIONS)) * 100)

        worker.exam_attempts = (worker.exam_attempts or 0) + 1
        worker.exam_score = score
        worker.exam_passed = score >= 80
        refresh_worker_authorization(worker)

        db.commit()
        db.refresh(worker)

        if worker.exam_passed:
            msg = f"¡Examen APROBADO con {score}/100 (>= 80%)! Se ha desbloqueado el Paso 2: Subida de Constancia Médica."
        else:
            msg = f"Obtuviste {score}/100. La nota mínima obligatoria es 80/100 (80%). Por favor revisa el material y vuelve a intentarlo."

        return {
            "passed": worker.exam_passed,
            "score": worker.exam_score,
            "attempts": worker.exam_attempts,
            "message": msg,
            "worker": serialize_worker(worker),
        }

    @staticmethod
    async def upload_and_validate_medical_cert(
        db: Session,
        worker_id: int,
        file: UploadFile,
        mock_behavior: str = "auto",
    ) -> dict:
        worker = WorkerRepository.get_by_id(db, worker_id)
        if not worker:
            raise HTTPException(status_code=404, detail="Trabajador no encontrado.")

        if not worker.exam_passed or worker.exam_score < 80:
            raise HTTPException(
                status_code=400,
                detail="Primero debes aprobar el Examen de Inducción con nota >= 80/100 (Paso 1).",
            )

        file_bytes = await file.read()
        filename = file.filename or "constancia_medica.pdf"
        content_type = file.content_type or "application/pdf"

        storage_url = upload_document_to_storage(file_bytes, filename, content_type)
        ai_validation = validate_medical_certificate_with_gemini(
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type,
            worker_full_name=f"{worker.first_name} {worker.last_name}",
            worker_dni=worker.dni,
            mock_behavior=mock_behavior,
        )

        worker.medical_cert_filename = filename
        worker.medical_cert_url = storage_url
        worker.medical_cert_status = ai_validation["status"]
        worker.medical_ai_feedback = ai_validation["resumen_validacion"]
        refresh_worker_authorization(worker)

        db.commit()
        db.refresh(worker)

        return {
            "message": (
                "Constancia médica VALIDADA por Gemini IA. ¡Ya estás AUTORIZADO PARA IR A MINA!"
                if ai_validation["valid"]
                else "El documento fue RECHAZADO por la auditoría médica de IA."
            ),
            "ai_validation": ai_validation,
            "worker": serialize_worker(worker),
        }
