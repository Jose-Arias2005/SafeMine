import base64
import json
from typing import Any, Dict
from app.core.config import settings

MEDICAL_CERT_SCHEMA = {
    "type": "object",
    "properties": {
        "es_certificado_medico_real": {
            "type": "boolean",
            "description": "True si el documento o imagen corresponde a un certificado o examen médico ocupacional real.",
        },
        "nombre_paciente_detectado": {
            "type": "string",
            "description": "Nombre del trabajador/paciente identificado en el documento.",
        },
        "resultado_aptitud": {
            "type": "string",
            "enum": ["APTO", "APTO CON RESTRICCIONES", "NO APTO", "ILEGIBLE_O_FALSO"],
            "description": "Condición médica ocupacional determinada en el documento.",
        },
        "coincide_con_trabajador": {
            "type": "boolean",
            "description": "True si los datos son consistentes o válidos para el trabajador evaluado.",
        },
        "resumen_validacion": {
            "type": "string",
            "description": "Explicación clara en español del dictamen de auditoría documental por IA.",
        },
    },
    "required": [
        "es_certificado_medico_real",
        "nombre_paciente_detectado",
        "resultado_aptitud",
        "coincide_con_trabajador",
        "resumen_validacion",
    ],
}


def validate_medical_certificate_with_gemini(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    worker_full_name: str,
    worker_dni: str,
    mock_behavior: str = "auto",
) -> Dict[str, Any]:
    lower_name = (filename or "").lower()

    if not settings.has_real_gemini_key or mock_behavior in ("mock_apto", "mock_rechazado"):
        is_rejected = (
            mock_behavior == "mock_rechazado"
            or "falso" in lower_name
            or "invalido" in lower_name
            or "no_apto" in lower_name
            or "rechazado" in lower_name
        )
        if is_rejected:
            return {
                "valid": False,
                "status": "RECHAZADA",
                "mode": "SIMULACION_IA",
                "model_used": f"{settings.GEMINI_MODEL} (Simulación Local)",
                "es_certificado_medico_real": False,
                "nombre_paciente_detectado": worker_full_name,
                "resultado_aptitud": "NO APTO",
                "coincide_con_trabajador": False,
                "resumen_validacion": (
                    f"[Simulación Gemini IA] El documento '{filename}' fue rechazado: no cumple con el formato de "
                    "Certificado de Aptitud Médico Ocupacional (EMO) vigente o registra condición NO APTO."
                ),
            }

        return {
            "valid": True,
            "status": "VALIDADA_POR_IA",
            "mode": "SIMULACION_IA",
            "model_used": f"{settings.GEMINI_MODEL} (Simulación Local)",
            "es_certificado_medico_real": True,
            "nombre_paciente_detectado": worker_full_name,
            "resultado_aptitud": "APTO",
            "coincide_con_trabajador": True,
            "resumen_validacion": (
                f"[Simulación Gemini IA] Certificado Médico Ocupacional (EMO) verificado correctamente para "
                f"{worker_full_name} (DNI {worker_dni}). Sello médico válido y dictamen final: APTO PARA TRABAJO EN GRAN ALTITUD Y MINA."
            ),
        }

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        b64_data = base64.b64encode(file_bytes).decode("utf-8")

        if "pdf" in (content_type or "").lower() or lower_name.endswith(".pdf"):
            media_part = {
                "type": "document",
                "data": b64_data,
                "mime_type": "application/pdf",
            }
        else:
            mime = content_type if content_type and content_type.startswith("image/") else "image/jpeg"
            if lower_name.endswith(".png"):
                mime = "image/png"
            media_part = {
                "type": "image",
                "data": b64_data,
                "mime_type": mime,
            }

        prompt_text = (
            f"Eres un auditor médico ocupacional minero de la plataforma SafeMine AI. "
            f"Analiza este archivo subido por el trabajador '{worker_full_name}' (DNI: {worker_dni}). "
            f"Verifica: 1) Que sea un certificado/examen médico real y no un documento irrelevante o falso. "
            f"2) Que el nombre o datos sean consistentes y el resultado de aptitud médica sea 'APTO'."
        )

        interaction = client.interactions.create(
            model=settings.GEMINI_MODEL,
            input=[
                media_part,
                {"type": "text", "text": prompt_text},
            ],
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": MEDICAL_CERT_SCHEMA,
            },
        )

        parsed = json.loads(interaction.output_text)
        is_valid = (
            bool(parsed.get("es_certificado_medico_real"))
            and parsed.get("resultado_aptitud") == "APTO"
        )

        return {
            "valid": is_valid,
            "status": "VALIDADA_POR_IA" if is_valid else "RECHAZADA",
            "mode": "GEMINI_CLOUD_API",
            "model_used": settings.GEMINI_MODEL,
            **parsed,
        }
    except Exception as exc:
        return {
            "valid": False,
            "status": "RECHAZADA",
            "mode": "ERROR_API_GEMINI",
            "model_used": settings.GEMINI_MODEL,
            "es_certificado_medico_real": False,
            "nombre_paciente_detectado": "No procesado",
            "resultado_aptitud": "ILEGIBLE_O_FALSO",
            "coincide_con_trabajador": False,
            "resumen_validacion": f"Error al consultar Google Gemini API ({exc}). Verifique su GEMINI_API_KEY o active USE_MOCK_AI=true.",
        }
