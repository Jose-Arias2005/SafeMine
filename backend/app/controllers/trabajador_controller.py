from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.user import User
from app.repositories.worker_repository import WorkerRepository
from app.schemas.worker_schema import ExamQuestionsResponse, ExamSubmitRequest
from app.services.trabajador_service import TrabajadorService

router = APIRouter(prefix="/api/trabajador", tags=["Rol 3: Trabajador"])


def require_own_worker_record(
    worker_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["TRABAJADOR"])),
) -> User:
    """Solo el TRABAJADOR dueño del perfil puede operar sobre su propio registro."""
    worker = WorkerRepository.get_by_id(db, worker_id)
    if worker is None or worker.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Acceso denegado: solo puedes operar sobre tu propio registro.",
        )
    return current_user


@router.get("/exam-questions", response_model=ExamQuestionsResponse)
def get_exam_questions():
    return TrabajadorService.get_exam_questions()


@router.get("/list")
def list_workers(db: Session = Depends(get_db)):
    return TrabajadorService.list_workers(db)


@router.get("/{worker_id}")
def get_worker_detail(worker_id: int, db: Session = Depends(get_db)):
    return TrabajadorService.get_worker_detail(db, worker_id)


@router.post("/{worker_id}/exam")
def submit_safety_exam(
    worker_id: int,
    req: ExamSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_own_worker_record),
):
    return TrabajadorService.submit_exam(db, worker_id, req)


@router.post("/{worker_id}/medical-cert")
async def upload_and_validate_medical_certificate(
    worker_id: int,
    file: UploadFile = File(...),
    mock_behavior: str = Form("auto"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_own_worker_record),
):
    return await TrabajadorService.upload_and_validate_medical_cert(
        db, worker_id, file, mock_behavior
    )
