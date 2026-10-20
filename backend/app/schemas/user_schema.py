from typing import Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Correo electrónico, usuario o DNI")
    password: str


class ProviderRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    company_name: str
    ruc: Optional[str] = "20609988771"


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str
    full_name: str
    company_name: Optional[str] = None
    ruc: Optional[str] = None
    worker_id: Optional[int] = None

    class Config:
        from_attributes = True
