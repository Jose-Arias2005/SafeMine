from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.worker import WorkerProfile


class WorkerRepository:
    @staticmethod
    def get_by_id(db: Session, worker_id: int) -> Optional[WorkerProfile]:
        return db.query(WorkerProfile).filter(WorkerProfile.id == worker_id).first()

    @staticmethod
    def get_by_dni(db: Session, dni: str) -> Optional[WorkerProfile]:
        return db.query(WorkerProfile).filter(WorkerProfile.dni == dni).first()

    @staticmethod
    def get_by_user_id(db: Session, user_id: int) -> Optional[WorkerProfile]:
        return db.query(WorkerProfile).filter(WorkerProfile.user_id == user_id).first()

    @staticmethod
    def list_all(db: Session) -> List[WorkerProfile]:
        return db.query(WorkerProfile).order_by(WorkerProfile.id.asc()).all()

    @staticmethod
    def delete_by_proposal_id(db: Session, proposal_id: int) -> None:
        db.query(WorkerProfile).filter(WorkerProfile.proposal_id == proposal_id).delete()
