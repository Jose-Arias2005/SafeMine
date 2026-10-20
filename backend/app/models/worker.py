from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class WorkerProfile(Base):
    __tablename__ = "worker_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id"), nullable=False)

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    dni = Column(String(20), index=True, nullable=False)
    email = Column(String(150), nullable=False)
    position = Column(String(100), nullable=False)

    generated_username = Column(String(100), nullable=True)
    generated_password = Column(String(100), nullable=True)

    exam_score = Column(Integer, default=0)
    exam_attempts = Column(Integer, default=0)
    exam_passed = Column(Boolean, default=False)

    medical_cert_filename = Column(String(255), nullable=True)
    medical_cert_url = Column(String(500), nullable=True)
    medical_cert_status = Column(String(40), default="PENDIENTE")
    medical_ai_feedback = Column(Text, nullable=True)

    is_authorized = Column(Boolean, default=False)

    mala_conducta = Column(Boolean, default=False)
    mal_trabajo = Column(Boolean, default=False)
    no_lleva_epps = Column(Boolean, default=False)
    faltas_epp_count = Column(Integer, default=0)
    observaciones = Column(Text, default="")

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="worker_profile")
    proposal = relationship("Proposal", back_populates="workers")
