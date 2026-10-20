from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.user import User


class UserRepository:
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(func.lower(User.email) == email.lower().strip()).first()

    @staticmethod
    def get_by_username(db: Session, username: str) -> Optional[User]:
        return db.query(User).filter(func.lower(User.username) == username.lower().strip()).first()

    @staticmethod
    def get_by_identifier(db: Session, identifier: str) -> Optional[User]:
        ident_lower = identifier.lower().strip()
        return (
            db.query(User)
            .filter(
                (func.lower(User.email) == ident_lower)
                | (func.lower(User.username) == ident_lower)
            )
            .first()
        )

    @staticmethod
    def list_all(db: Session) -> List[User]:
        return db.query(User).order_by(User.id.asc()).all()

    @staticmethod
    def create(db: Session, user: User) -> User:
        db.add(user)
        db.flush()
        return user
