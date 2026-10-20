from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.worker_schema import ExamSubmitRequest
from app.services.trabajador_service import TrabajadorService

router = APIRouter(prefix="/api/trabajador", tags=["Rol 3: Trabajador"])


@router.get("/exam-questions")
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
    worker_id: int, req: ExamSubmitRequest, db: Session = Depends(get_db)
):
    return TrabajadorService.submit_exam(db, worker_id, req)


@router.post("/{worker_id}/medical-cert")
async def upload_and_validate_medical_certificate(
    worker_id: int,
    file: UploadFile = File(...),
    mock_behavior: str = Form("auto"),
    db: Session = Depends(get_db),
):
    return await TrabajadorService.upload_and_validate_medical_cert(
        db, worker_id, file, mock_behavior
    )
