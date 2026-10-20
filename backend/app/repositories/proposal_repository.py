from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.proposal import Proposal


class ProposalRepository:
    @staticmethod
    def get_by_id(db: Session, proposal_id: int) -> Optional[Proposal]:
        return db.query(Proposal).filter(Proposal.id == proposal_id).first()

    @staticmethod
    def list_all(db: Session) -> List[Proposal]:
        return db.query(Proposal).order_by(Proposal.id.asc()).all()

    @staticmethod
    def create(db: Session, proposal: Proposal) -> Proposal:
        db.add(proposal)
        db.commit()
        db.refresh(proposal)
        return proposal
