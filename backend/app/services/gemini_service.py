import json
import re
from typing import Any, Optional
from pydantic import BaseModel, field_validator
from app.core.config import settings

ALLOWED_APTITUDE_VALUES = {"APTO", "NO_APTO", "NO_DETERMINADO"}

MEDICAL_AUDIT_SYSTEM_INSTRUCTION = (
    "Eres un médico auditor de Seguridad y Salud Ocupacional (SSO) minera en el Perú. "
    "Evalúa el documento adjunto bajo la normativa minera peruana DS 024-2016-EM "
    "(Anexo 16 - Certificado de Aptitud Médico Ocupacional). "
    "Debes verificar estrictamente: "
    "1) Que el documento sea efectivamente un certificado médico ocupacional legítimo. "
    "2) Que los nombres y DNI del operario concuerden con el titular evaluado (si son legibles). "
    "3) Que el dictamen médico concluya expresamente como 'APTO' (usa 'NO_APTO' si indica no apto/observado "
    "o 'NO_DETERMINADO' si no es legible o no es un certificado médico). "
    "Responde EXCLUSIVAMENTE con un objeto JSON válido que cumpla las claves de MedicalAuditResult, "
    "sin texto conversacional ni bloques markdown."
)


class MedicalAuditResult(BaseModel):
    is_medical_certificate: bool
    worker_dni: Optional[str] = None
    worker_name: Optional[str] = None
    aptitude_result: str  # Valores permitidos: "APTO", "NO_APTO", "NO_DETERMINADO"
    confidence_score: float
    rejection_reason: Optional[str] = None

    @field_validator("aptitude_result", mode="before")
    @classmethod
    def normalize_aptitude(cls, value: Any) -> str:
        if not isinstance(value, str):
            return "NO_DETERMINADO"
        cleaned = value.strip().upper().replace(" ", "_")
        if cleaned in ALLOWED_APTITUDE_VALUES:
            return cleaned
        if "NO_APTO" in cleaned or "RESTRIC" in cleaned:
            return "NO_APTO"
        return "NO_DETERMINADO"

    @field_validator("confidence_score", mode="before")
    @classmethod
    def normalize_confidence(cls, value: Any) -> float:
        score = float(value)
        if 1.0 < score <= 100.0:
            score = score / 100.0
        return max(0.0, min(1.0, score))


def parse_medical_audit_payload(raw_payload: Any) -> MedicalAuditResult:
    """Convierte una respuesta estructurada o texto JSON del LLM en MedicalAuditResult."""
    if isinstance(raw_payload, MedicalAuditResult):
        return raw_payload
    if isinstance(raw_payload, dict):
        return MedicalAuditResult.model_validate(raw_payload)
    if isinstance(raw_payload, str):
        cleaned = raw_payload.strip()
        fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
        if fence_match:
            cleaned = fence_match.group(1).strip()
        data = json.loads(cleaned)
        return MedicalAuditResult.model_validate(data)
    raise ValueError("Payload de auditoría médica no soportado.")


def _resolve_mime_type(filename: str, content_type: Optional[str]) -> str:
    lower_name = (filename or "").lower()
    ct = (content_type or "").lower()
    if "pdf" in ct or lower_name.endswith(".pdf"):
        return "application/pdf"
    if lower_name.endswith(".png") or ct == "image/png":
        return "image/png"
    if lower_name.endswith(".webp") or ct == "image/webp":
        return "image/webp"
    return "image/jpeg"


def validate_medical_certificate_with_gemini(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    worker_full_name: str,
    worker_dni: str,
    mock_behavior: str = "auto",
) -> MedicalAuditResult:
    lower_name = (filename or "").lower()

    # 1. Modo Simulación / Respaldo cuando USE_MOCK_AI=true o no hay GEMINI_API_KEY
    if not settings.has_real_gemini_key or mock_behavior in ("mock_apto", "mock_rechazado"):
        if mock_behavior == "mock_apto":
            is_rejected = False
        elif mock_behavior == "mock_rechazado":
            is_rejected = True
        else:
            is_rejected = any(
                keyword in lower_name
                for keyword in ("falso", "rechazado", "invalido", "no_apto")
            )
        if is_rejected:
            return MedicalAuditResult(
                is_medical_certificate=False,
                aptitude_result="NO_APTO",
                confidence_score=0.95,
                rejection_reason="El documento presentado no corresponde a un certificado médico oficial.",
            )

        return MedicalAuditResult(
            is_medical_certificate=True,
            worker_dni=worker_dni or None,
            worker_name=worker_full_name or None,
            aptitude_result="APTO",
            confidence_score=0.98,
            rejection_reason=None,
        )

    # 2. Inferencia Real con Google Gemini SDK (esquema JSON estricto)
    mime_type = _resolve_mime_type(filename, content_type)
    user_prompt = (
        f"Audita el documento adjunto presentado por el operario '{worker_full_name}' "
        f"(DNI esperado: '{worker_dni}'). Verifica su autenticidad como Certificado de Aptitud "
        f"Médico Ocupacional (DS 024-2016-EM / Anexo 16), concordancia de identidad y dictamen APTO."
    )

    try:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=[
                    types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                    user_prompt,
                ],
                config=types.GenerateContentConfig(
                    system_instruction=MEDICAL_AUDIT_SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=MedicalAuditResult,
                    temperature=0.0,
                ),
            )

            parsed_obj = getattr(response, "parsed", None)
            if parsed_obj is not None:
                return parse_medical_audit_payload(parsed_obj)
            return parse_medical_audit_payload(response.text)
        except ImportError:
            # Fallback para entornos con el paquete clásico google-generativeai
            import google.generativeai as classic_genai  # type: ignore

            classic_genai.configure(api_key=settings.GEMINI_API_KEY)
            model = classic_genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                system_instruction=MEDICAL_AUDIT_SYSTEM_INSTRUCTION,
                generation_config={"response_mime_type": "application/json"},
            )
            response = model.generate_content(
                [
                    {"mime_type": mime_type, "data": file_bytes},
                    user_prompt,
                ]
            )
            return parse_medical_audit_payload(response.text)
    except Exception as exc:
        return MedicalAuditResult(
            is_medical_certificate=False,
            aptitude_result="NO_DETERMINADO",
            confidence_score=0.0,
            rejection_reason=f"No se pudo completar la auditoría médica con Gemini IA: {exc}",
        )
