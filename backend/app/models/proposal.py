from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    quota = Column(Integer, default=10, nullable=False)
    start_date = Column(String(50), nullable=False)
    required_epps = Column(Text, nullable=False)  # JSON array
    status = Column(String(30), default="ABIERTA")  # ABIERTA | POSTULADA | ACEPTADA
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    provider_company_name = Column(String(150), nullable=True)

    report_sent = Column(Boolean, default=False)
    report_sent_at = Column(String(50), nullable=True)
    report_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workers = relationship(
        "WorkerProfile", back_populates="proposal", cascade="all, delete-orphan"
    )
