from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class VerifyQRRequest(BaseModel):
    qr_data: str = Field(..., description="JSON codificado en el QR o DNI/worker_id directo")


class WorkerRosterItem(BaseModel):
    worker_id: int
    id: int
    dni: str
    full_name: str
    position: str
    company_name: Optional[str] = None
    is_authorized: bool
    exam_passed: bool
    exam_score: int
    medical_cert_status: str
    qr_token: str
    required_epps: List[str] = Field(
        default_factory=lambda: ["HEAD_COVER", "HAND_COVER", "FACE_COVER"]
    )


class AuthorizedRosterResponse(BaseModel):
    total: int
    roster: List[WorkerRosterItem]
    downloaded_at: str


class OfflineLogEntry(BaseModel):
    worker_id: Optional[int] = None
    worker_dni: Optional[str] = None
    worker_name: Optional[str] = None
    phase: Optional[str] = "FASE_2_EPP"
    status: str = Field(..., description="VERDE | ROJO | QR_OK")
    missing_items: Optional[List[str]] = Field(default_factory=list)
    missing_epps: Optional[List[str]] = Field(default_factory=list)
    detected_epps: Optional[List[str]] = Field(default_factory=list)
    message: Optional[str] = None
    timestamp: Optional[str] = None


class SyncOfflineLogsRequest(BaseModel):
    logs: List[OfflineLogEntry]


class SyncOfflineLogsResponse(BaseModel):
    success: bool
    synced_count: int
    message: str
    synced_at: str
