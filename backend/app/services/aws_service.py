import json
import os
import uuid
from typing import Any, Dict, List, Optional
import boto3
from app.core.config import settings

CANONICAL_EPP_TYPES: tuple[str, ...] = ("HEAD_COVER", "HAND_COVER", "FACE_COVER")


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
                return [str(x).strip().upper() for x in parsed if str(x).strip().upper() in CANONICAL_EPP_TYPES]
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


def verify_epp_with_rekognition(
    image_bytes: Optional[bytes],
    required_epps: Optional[List[str]] = None,
    simulate_mode: Optional[str] = None,
    missing_override: Optional[List[str]] = None,
) -> List[str]:
    """
    Devuelve la lista unificada de protecciones detectadas: `detected_epps: list[str]`.
    """
    req_list = list(required_epps) if required_epps is not None else list(CANONICAL_EPP_TYPES)

    if simulate_mode is not None or not settings.has_real_aws_keys:
        return _resolve_simulated_epps(req_list, simulate_mode, missing_override)

    if not image_bytes:
        return []

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
