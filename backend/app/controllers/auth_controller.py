import base64
import json
import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.seed import hash_password
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.worker_repository import WorkerRepository
from app.schemas.user_schema import LoginRequest, ProviderRegisterRequest

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


def create_token(user: User, worker_id: int | None = None) -> str:
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "worker_id": worker_id,
        "exp": int(time.time()) + 86400 * 7,
    }
    return base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    identifier = req.identifier.strip()
    pwd_hash = hash_password(req.password.strip())

    user = UserRepository.get_by_identifier(db, identifier)

    if not user:
        worker_by_dni = WorkerRepository.get_by_dni(db, identifier)
        if worker_by_dni and worker_by_dni.user_id:
            user = UserRepository.get_by_id(db, worker_by_dni.user_id)

    if not user or (
        user.password_hash != pwd_hash and req.password.strip() != user.plain_password_hint
    ):
        raise HTTPException(
            status_code=401,
            detail="Credenciales inválidas. Verifique su usuario/DNI y contraseña.",
        )

    worker_profile = (
        WorkerRepository.get_by_user_id(db, user.id)
        if user.role == "TRABAJADOR"
        else None
    )
    worker_id = worker_profile.id if worker_profile else None

    return {
        "access_token": create_token(user, worker_id),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "role": user.role,
            "full_name": user.full_name,
            "company_name": user.company_name,
            "ruc": user.ruc,
            "worker_id": worker_id,
            "dni": worker_profile.dni if worker_profile else None,
        },
    }


@router.post("/register-provider")
def register_provider(req: ProviderRegisterRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    if UserRepository.get_by_email(db, email):
        raise HTTPException(
            status_code=400,
            detail="Ya existe una cuenta registrada con ese correo electrónico.",
        )

    username = email.split("@")[0]
    if UserRepository.get_by_username(db, username):
        username = f"{username}_{int(time.time()) % 10000}"

    new_user = User(
        email=email,
        username=username,
        password_hash=hash_password(req.password),
        plain_password_hint=req.password,
        role="PROVEEDOR",
        full_name=req.full_name.strip(),
        company_name=req.company_name.strip(),
        ruc=req.ruc,
    )
    UserRepository.create(db, new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "access_token": create_token(new_user),
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "username": new_user.username,
            "role": new_user.role,
            "full_name": new_user.full_name,
            "company_name": new_user.company_name,
            "ruc": new_user.ruc,
            "worker_id": None,
        },
    }


@router.get("/demo-accounts")
def get_demo_accounts(db: Session = Depends(get_db)):
    users = UserRepository.list_all(db)
    result = []
    for u in users:
        wp = (
            WorkerRepository.get_by_user_id(db, u.id)
            if u.role == "TRABAJADOR"
            else None
        )
        result.append(
            {
                "id": u.id,
                "email": u.email,
                "username": u.username,
                "password": u.plain_password_hint or "minera123",
                "role": u.role,
                "full_name": u.full_name,
                "company_name": u.company_name,
                "worker_id": wp.id if wp else None,
                "dni": wp.dni if wp else None,
                "is_authorized": wp.is_authorized if wp else None,
            }
        )
    return {"accounts": result}
