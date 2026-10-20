from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.proposal_schema import (
    ProposalCreateRequest,
    SaveEvaluationsRequest,
    SendReportRequest,
)
from app.services.minera_service import MineraService

router = APIRouter(prefix="/api/minera", tags=["Rol 1: Minera"])


@router.get("/proposals")
def list_all_proposals(db: Session = Depends(get_db)):
    return MineraService.list_proposals(db)


@router.post("/proposals")
def create_proposal(req: ProposalCreateRequest, db: Session = Depends(get_db)):
    return MineraService.create_proposal(db, req)


@router.post("/proposals/{proposal_id}/accept")
def accept_proposal(proposal_id: int, db: Session = Depends(get_db)):
    return MineraService.accept_proposal_and_generate_accounts(db, proposal_id)


@router.put("/proposals/{proposal_id}/evaluations")
def save_worker_evaluations(
    proposal_id: int, req: SaveEvaluationsRequest, db: Session = Depends(get_db)
):
    return MineraService.save_evaluations(db, proposal_id, req)


@router.post("/proposals/{proposal_id}/send-report")
def send_evaluation_report_to_provider(
    proposal_id: int, req: SendReportRequest, db: Session = Depends(get_db)
):
    return MineraService.send_report_to_provider(db, proposal_id, req)
