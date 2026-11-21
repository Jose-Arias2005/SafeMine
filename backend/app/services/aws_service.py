import json
import os
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple
import boto3
from pydantic import BaseModel
from app.core.config import settings

CANONICAL_EPP_TYPES: tuple[str, ...] = ("HEAD_COVER", "HAND_COVER", "FACE_COVER")

EPP_VISION_SYSTEM_INSTRUCTION = (
    "Eres un sistema experto de visión artificial para Seguridad y Salud Ocupacional (SSO) en minería. "
    "Analiza la fotografía del operario e identifica qué Equipos de Protección Personal (EPPs) lleva puestos "
    "correctamente sobre su cuerpo: "
    "1) HEAD_COVER (`head_cover`): Casco de seguridad industrial puesto en la cabeza. "
    "2) HAND_COVER (`hand_cover`): Guantes de seguridad puestos en las manos. "
    "3) FACE_COVER (`face_cover`): Lentes de seguridad, careta facial, mascarilla o respirador puesto en el rostro. "
    "Incluye únicamente las etiquetas que observes con claridad y certeza en `detected_epps` "
    "y marca sus booleanos correspondientes. Responde EXCLUSIVAMENTE en JSON válido."
)


class GeminiEppVisionResult(BaseModel):
    head_cover: bool = False
    hand_cover: bool = False
    face_cover: bool = False
    detected_epps: List[str] = []


def _infer_image_mime_type(image_bytes: bytes) -> str:
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(image_bytes) >= 12 and image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _normalize_gemini_epp_result(raw_payload: Any) -> List[str]:
    if isinstance(raw_payload, GeminiEppVisionResult):
        parsed = raw_payload
    elif isinstance(raw_payload, dict):
        parsed = GeminiEppVisionResult.model_validate(raw_payload)
    elif isinstance(raw_payload, str):
        cleaned = raw_payload.strip()
        fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
        if fence_match:
            cleaned = fence_match.group(1).strip()
        parsed = GeminiEppVisionResult.model_validate(json.loads(cleaned))
    else:
        return []

    found = set()
    normalized_list = {
        str(item).strip().upper()
        for item in (parsed.detected_epps or [])
        if str(item).strip().upper() in CANONICAL_EPP_TYPES
    }
    if parsed.head_cover or "HEAD_COVER" in normalized_list:
        found.add("HEAD_COVER")
    if parsed.hand_cover or "HAND_COVER" in normalized_list:
        found.add("HAND_COVER")
    if parsed.face_cover or "FACE_COVER" in normalized_list:
        found.add("FACE_COVER")

    return [epp for epp in CANONICAL_EPP_TYPES if epp in found]


def upload_document_to_storage(file_bytes: bytes, filename: str, content_type: str) -> str:
    ext = os.path.splitext(filename or "certificado.pdf")[1] or ".pdf"
    safe_name = f"cert_{uuid.uuid4().hex[:10]}{ext}"

    if settings.has_real_aws_keys and settings.AWS_S3_BUCKET:
        try:
            s3 = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
            key = f"constancias-medicas/{safe_name}"
            s3.put_object(
                Bucket=settings.AWS_S3_BUCKET,
                Key=key,
                Body=file_bytes,
                ContentType=content_type or "application/pdf",
            )
            return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
        except Exception as exc:
            print(f"[AWS S3 Fallback] No se pudo subir a S3 ({exc}), guardando localmente.")

    uploads_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads"
    )
    os.makedirs(uploads_dir, exist_ok=True)
    local_path = os.path.join(uploads_dir, safe_name)
    with open(local_path, "wb") as f:
        f.write(file_bytes)
    return f"/uploads/{safe_name}"


def extract_detected_epps_from_rekognition(
    response: Dict[str, Any],
    min_confidence: float = 80.0,
) -> List[str]:
    """
    Recorre Persons[].BodyParts[].EquipmentDetections[] y extrae etiquetas válidas
    (HEAD_COVER, HAND_COVER, FACE_COVER) donde CoversBodyPart.Value is True y
    Confidence >= 80.0%.
    """
    threshold = max(80.0, float(min_confidence))
    found = set()

    for person in response.get("Persons", []):
        for body_part in person.get("BodyParts", []):
            for eq in body_part.get("EquipmentDetections", []):
                eq_type = eq.get("Type")
                confidence = float(eq.get("Confidence", 0.0))
                covers_body = eq.get("CoversBodyPart", {}).get("Value") is True
                if eq_type in CANONICAL_EPP_TYPES and covers_body and confidence >= threshold:
                    found.add(eq_type)

    return [epp for epp in CANONICAL_EPP_TYPES if epp in found]


def _resolve_simulated_epps(
    required_epps: List[str],
    simulate_mode: Optional[str],
    missing_override: Optional[List[str]] = None,
) -> List[str]:
    baseline = list(required_epps) if required_epps else list(CANONICAL_EPP_TYPES)

    if not simulate_mode or simulate_mode == "CON_EPP":
        return list(baseline)

    if simulate_mode in ("NINGUNO", "NONE", "EMPTY"):
        return []

    if simulate_mode == "SIN_EPP":
        to_drop = set(missing_override or ["HAND_COVER", "FACE_COVER"])
        remaining = [epp for epp in baseline if epp not in to_drop]
        # Garantiza que en escenario SIN_EPP falte al menos un EPP requerido
        return [] if len(remaining) == len(baseline) else remaining

    # Permite especificar etiquetas explícitas en pruebas (JSON o lista separada por comas)
    raw = simulate_mode.strip()
    if raw.startswith("["):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [
                    str(x).strip().upper()
                    for x in parsed
                    if str(x).strip().upper() in CANONICAL_EPP_TYPES
                ]
        except Exception:
            pass

    explicit = [
        token.strip().upper()
        for token in raw.split(",")
        if token.strip().upper() in CANONICAL_EPP_TYPES
    ]
    if explicit:
        return explicit

    return list(baseline)


def _detect_epps_with_aws_rekognition(image_bytes: bytes) -> List[str]:
    try:
        rekognition = boto3.client(
            "rekognition",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        response = rekognition.detect_protective_equipment(
            Image={"Bytes": image_bytes},
            SummarizationAttributes={
                "MinConfidence": max(80.0, float(settings.MIN_EPP_CONFIDENCE)),
                "RequiredEquipmentTypes": list(CANONICAL_EPP_TYPES),
            },
        )
        return extract_detected_epps_from_rekognition(
            response, min_confidence=settings.MIN_EPP_CONFIDENCE
        )
    except Exception as exc:
        print(f"[AWS Rekognition Error] {exc}")
        return []


def _detect_epps_with_gemini(image_bytes: bytes) -> List[str]:
    mime_type = _infer_image_mime_type(image_bytes)
    user_prompt = (
        "Inspecciona la imagen de garita e indica qué EPPs obligatorios lleva puestos el trabajador "
        "(HEAD_COVER, HAND_COVER, FACE_COVER)."
    )

    try:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    user_prompt,
                ],
                config=types.GenerateContentConfig(
                    system_instruction=EPP_VISION_SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=GeminiEppVisionResult,
                    temperature=0.0,
                ),
            )
            parsed_obj = getattr(response, "parsed", None)
            if parsed_obj is not None:
                return _normalize_gemini_epp_result(parsed_obj)
            return _normalize_gemini_epp_result(response.text)
        except ImportError:
            import google.generativeai as classic_genai  # type: ignore

            classic_genai.configure(api_key=settings.GEMINI_API_KEY)
            model = classic_genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                system_instruction=EPP_VISION_SYSTEM_INSTRUCTION,
                generation_config={"response_mime_type": "application/json"},
            )
            response = model.generate_content(
                [{"mime_type": mime_type, "data": image_bytes}, user_prompt]
            )
            return _normalize_gemini_epp_result(response.text)
    except Exception as exc:
        print(f"[Gemini Vision EPP Error] {exc}")
        return []


def analyze_epp_image(
    image_bytes: Optional[bytes],
    required_epps: Optional[List[str]] = None,
    simulate_mode: Optional[str] = None,
    missing_override: Optional[List[str]] = None,
) -> Tuple[List[str], List[str], bool]:
    """
    Evalúa una fotografía de garita y devuelve `(detected_epps, missing_epps, is_compliant)`:
    - Si `simulate_mode` viene explícito, resuelve el escenario simulado.
    - Si hay credenciales AWS reales (`USE_MOCK_AWS=false`), usa AWS Rekognition.
    - Si `USE_MOCK_AWS=true` pero existe `GEMINI_API_KEY` real (`USE_MOCK_AI=false`), usa Gemini Vision.
    - En otro caso, opera en modo simulación sin costo.
    """
    req_list = list(required_epps) if required_epps is not None else list(CANONICAL_EPP_TYPES)

    if simulate_mode is not None:
        detected_epps = _resolve_simulated_epps(req_list, simulate_mode, missing_override)
    elif settings.has_real_aws_keys:
        detected_epps = (
            _detect_epps_with_aws_rekognition(image_bytes) if image_bytes else []
        )
    elif settings.has_real_gemini_key and image_bytes:
        detected_epps = _detect_epps_with_gemini(image_bytes)
    else:
        detected_epps = _resolve_simulated_epps(req_list, simulate_mode, missing_override)

    missing_epps = [epp for epp in req_list if epp not in detected_epps]
    is_compliant = len(missing_epps) == 0
    return detected_epps, missing_epps, is_compliant


def verify_epp_with_rekognition(
    image_bytes: Optional[bytes],
    required_epps: Optional[List[str]] = None,
    simulate_mode: Optional[str] = None,
    missing_override: Optional[List[str]] = None,
) -> List[str]:
    """
    Devuelve la lista unificada de protecciones detectadas: `detected_epps: list[str]`.
    """
    detected_epps, _, _ = analyze_epp_image(
        image_bytes=image_bytes,
        required_epps=required_epps,
        simulate_mode=simulate_mode,
        missing_override=missing_override,
    )
    return detected_epps
