from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from app.db.base import Base


class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("worker_profiles.id"), nullable=True)
    worker_name = Column(String(200), nullable=False)
    worker_dni = Column(String(20), nullable=False)
    phase = Column(String(30), nullable=False)  # FASE_1_QR | FASE_2_EPP
    status = Column(String(20), nullable=False)  # VERDE | ROJO | QR_OK
    detected_epps = Column(Text, default="[]")
    missing_epps = Column(Text, default="[]")
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
