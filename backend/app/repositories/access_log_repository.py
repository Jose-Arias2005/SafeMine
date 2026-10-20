from typing import List
from sqlalchemy.orm import Session
from app.models.access_log import AccessLog


class AccessLogRepository:
    @staticmethod
    def create(db: Session, log_entry: AccessLog) -> AccessLog:
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

    @staticmethod
    def list_recent(db: Session, limit: int = 25) -> List[AccessLog]:
        return db.query(AccessLog).order_by(AccessLog.id.desc()).limit(limit).all()
