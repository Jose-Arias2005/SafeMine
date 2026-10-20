from typing import List, Optional
from pydantic import BaseModel, Field


class WorkerCandidateInput(BaseModel):
    first_name: str
    last_name: str
    dni: str
    email: str
    position: str


class WorkerEvaluationItem(BaseModel):
    worker_id: int
    mala_conducta: bool
    mal_trabajo: bool
    no_lleva_epps: bool
    observaciones: str = ""


class ExamSubmitRequest(BaseModel):
    answers: List[int] = Field(..., description="Índices de las respuestas seleccionadas")
    score_override: Optional[int] = None
