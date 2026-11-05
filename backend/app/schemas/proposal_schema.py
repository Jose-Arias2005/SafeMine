from typing import List, Optional
from pydantic import BaseModel
from app.schemas.worker_schema import WorkerCandidateInput, WorkerEvaluationItem


class ProposalCreateRequest(BaseModel):
    title: str
    description: str
    quota: int = 10
    start_date: str
    required_epps: List[str] = ["HEAD_COVER", "HAND_COVER", "FACE_COVER"]


class PostulateSquadRequest(BaseModel):
    # La identidad del proveedor proviene SIEMPRE del token autenticado,
    # nunca del cuerpo (un `provider_id` enviado por el cliente se ignora).
    workers: List[WorkerCandidateInput]


class SaveEvaluationsRequest(BaseModel):
    evaluations: List[WorkerEvaluationItem]


class SendReportRequest(BaseModel):
    report_summary: Optional[str] = None
