from pydantic import BaseModel, Field


class VerifyQRRequest(BaseModel):
    qr_data: str = Field(..., description="JSON codificado en el QR o DNI/worker_id directo")
