from typing import Callable, List, Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import verify_access_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("No autenticado: falta el token de acceso (Bearer).")

    claims = verify_access_token(credentials.credentials)
    if claims is None:
        raise _unauthorized("Token inválido o expirado. Inicie sesión nuevamente.")

    try:
        user_id = int(claims.get("user_id"))
    except (TypeError, ValueError):
        raise _unauthorized("Token inválido: no contiene un usuario válido.")

    user = UserRepository.get_by_id(db, user_id)
    if user is None:
        raise _unauthorized("Token inválido: el usuario ya no existe.")

    return user


def require_role(allowed_roles: List[str]) -> Callable[..., User]:
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Acceso denegado: permisos insuficientes",
            )
        return current_user

    return role_checker

