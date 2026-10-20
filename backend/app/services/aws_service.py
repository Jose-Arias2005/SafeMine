import os
import uuid
from typing import Any, Dict, List, Optional
import boto3
from app.core.config import settings

EPP_LABELS_ES = {
    "HEAD_COVER": "Casco de Seguridad (HEAD_COVER)",
    "HAND_COVER": "Guantes de Seguridad (HAND_COVER)",
    "FACE_COVER": "Protección Facial / Lentes / Mascarilla (FACE_COVER)",
}


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


def verify_epp_with_rekognition(
    image_bytes: Optional[bytes],
    required_epps: List[str],
    simulate_mode: Optional[str] = None,
    missing_override: Optional[List[str]] = None,
) -> Dict[str, Any]:
    if not required_epps:
        required_epps = ["HEAD_COVER", "HAND_COVER", "FACE_COVER"]

    if simulate_mode == "CON_EPP":
        detected_labels = [EPP_LABELS_ES.get(code, code) for code in required_epps]
        return {
            "all_epp_present": True,
            "detected_epps": detected_labels,
            "missing_epps": [],
            "mode": "SIMULACION_CON_EPP",
            "person_detected": True,
            "confidence_summary": "Casco: 99.4% | Guantes: 97.8% | Protección Facial: 98.2%",
        }

    if simulate_mode == "SIN_EPP":
        missing_codes = missing_override or ["HEAD_COVER", "HAND_COVER"]
        missing_labels = [EPP_LABELS_ES.get(code, code) for code in missing_codes]
        detected_labels = [
            EPP_LABELS_ES.get(code, code)
            for code in required_epps
            if code not in missing_codes
        ]
        return {
            "all_epp_present": False,
            "detected_epps": detected_labels,
            "missing_epps": missing_labels,
            "mode": "SIMULACION_SIN_EPP",
            "person_detected": True,
            "confidence_summary": "Alerta: Persona detectada en garita sin EPPs obligatorios completos.",
        }

    if not settings.has_real_aws_keys or not image_bytes:
        detected_labels = [EPP_LABELS_ES.get(code, code) for code in required_epps]
        return {
            "all_epp_present": True,
            "detected_epps": detected_labels,
            "missing_epps": [],
            "mode": "MOCK_CAMERA_FRAME",
            "person_detected": True,
            "confidence_summary": "Modo Mock Activo (Configure AWS_ACCESS_KEY_ID y USE_MOCK_AWS=false para AWS Rekognition real)",
        }

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
                "MinConfidence": settings.MIN_EPP_CONFIDENCE,
                "RequiredEquipmentTypes": required_epps,
            },
        )

        persons = response.get("Persons", [])
        if not persons:
            return {
                "all_epp_present": False,
                "detected_epps": [],
                "missing_epps": ["Ninguna persona detectada frente a la cámara"],
                "mode": "AWS_REKOGNITION_CLOUD",
                "person_detected": False,
                "confidence_summary": "No se detectó ningún operario en el encuadre.",
            }

        first_person = persons[0]
        found_types = set()

        for body_part in first_person.get("BodyParts", []):
            for eq in body_part.get("EquipmentDetections", []):
                eq_type = eq.get("Type")
                confidence = eq.get("Confidence", 0.0)
                covers_body_part = eq.get("CoversBodyPart", {}).get("Value", True)
                if confidence >= settings.MIN_EPP_CONFIDENCE and covers_body_part:
                    found_types.add(eq_type)

        detected_labels = [
            EPP_LABELS_ES.get(code, code) for code in required_epps if code in found_types
        ]
        missing_labels = [
            EPP_LABELS_ES.get(code, code) for code in required_epps if code not in found_types
        ]

        return {
            "all_epp_present": len(missing_labels) == 0,
            "detected_epps": detected_labels,
            "missing_epps": missing_labels,
            "mode": "AWS_REKOGNITION_CLOUD",
            "person_detected": True,
            "confidence_summary": f"AWS Rekognition ({settings.MIN_EPP_CONFIDENCE}% min confidence) - Detectados: {len(detected_labels)}/{len(required_epps)}",
        }
    except Exception as exc:
        return {
            "all_epp_present": False,
            "detected_epps": [],
            "missing_epps": [f"Error AWS Rekognition: {str(exc)}"],
            "mode": "ERROR_AWS_REKOGNITION",
            "person_detected": False,
            "confidence_summary": "Error de conexión con AWS Rekognition. Verifique sus credenciales en .env.",
        }
