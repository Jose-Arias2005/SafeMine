from typing import List
from pydantic import BaseModel, ConfigDict, Field


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
    # El puntaje se calcula siempre en el servidor; cualquier campo extra
    # (p. ej. un intento de enviar la nota) se rechaza con 422.
    model_config = ConfigDict(extra="forbid")

    answers: List[int] = Field(..., description="Índices de las respuestas seleccionadas")


class ExamQuestionOut(BaseModel):
    """Pregunta pública del examen. NUNCA incluye la clave de respuesta."""

    id: int
    question: str
    options: List[str]


class ExamQuestionsResponse(BaseModel):
    questions: List[ExamQuestionOut]
    passing_score: int
