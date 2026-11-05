"""
Utilidades criptográficas para tokens JWT (HS256) usando solo la biblioteca estándar.

Formato: base64url(header) . base64url(payload) . base64url(HMAC-SHA256(secret, "header.payload"))
"""

import base64
import hashlib
import hmac
import json
import time
from typing import Optional

from app.core.config import settings

# Fallback solo para desarrollo local si JWT_SECRET_KEY llega vacío.
# En producción, definir siempre JWT_SECRET_KEY en el entorno.
_LOCAL_DEV_FALLBACK_SECRET = "safemine-local-dev-only-secret-change-me"

_JWT_HEADER = {"alg": "HS256", "typ": "JWT"}


def _get_secret() -> bytes:
    secret = settings.JWT_SECRET_KEY or _LOCAL_DEV_FALLBACK_SECRET
    return secret.encode("utf-8")


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(segment: str) -> bytes:
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode((segment + padding).encode("ascii"))


def _sign(signing_input: str) -> str:
    digest = hmac.new(
        _get_secret(), signing_input.encode("ascii"), hashlib.sha256
    ).digest()
    return _b64url_encode(digest)


def create_access_token(payload: dict, expires_in_seconds: int = 259200) -> str:
    """Genera un JWT HS256 con claims `iat` y `exp` (por defecto 3 días)."""
    now = int(time.time())
    claims = {**payload, "iat": now, "exp": now + int(expires_in_seconds)}

    header_b64 = _b64url_encode(
        json.dumps(_JWT_HEADER, separators=(",", ":")).encode("utf-8")
    )
    payload_b64 = _b64url_encode(
        json.dumps(claims, separators=(",", ":"), default=str).encode("utf-8")
    )
    signing_input = f"{header_b64}.{payload_b64}"
    return f"{signing_input}.{_sign(signing_input)}"


def verify_access_token(token: str) -> Optional[dict]:
    """Devuelve los claims si el token es válido y no ha expirado; si no, None."""
    if not token or not isinstance(token, str):
        return None

    parts = token.split(".")
    if len(parts) != 3:
        return None
    header_b64, payload_b64, signature_b64 = parts

    try:
        header = json.loads(_b64url_decode(header_b64))
        # Rechaza explícitamente "alg: none" u otros algoritmos.
        if not isinstance(header, dict) or header.get("alg") != "HS256":
            return None

        expected_signature = _sign(f"{header_b64}.{payload_b64}")
        if not hmac.compare_digest(
            expected_signature.encode("ascii"), signature_b64.encode("ascii")
        ):
            return None

        claims = json.loads(_b64url_decode(payload_b64))
    except (ValueError, UnicodeError, TypeError):
        return None

    if not isinstance(claims, dict):
        return None

    exp = claims.get("exp")
    if isinstance(exp, bool) or not isinstance(exp, (int, float)):
        return None
    if exp <= time.time():
        return None

    return claims

