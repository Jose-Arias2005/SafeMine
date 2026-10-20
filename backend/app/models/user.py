from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    plain_password_hint = Column(String(100), nullable=True)
    role = Column(String(30), nullable=False)  # MINERA | PROVEEDOR | TRABAJADOR
    full_name = Column(String(150), nullable=False)
    company_name = Column(String(150), nullable=True)
    ruc = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    worker_profile = relationship("WorkerProfile", back_populates="user", uselist=False)
