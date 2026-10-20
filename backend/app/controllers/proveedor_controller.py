from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.proposal_schema import PostulateSquadRequest
from app.services.proveedor_service import ProveedorService

router = APIRouter(prefix="/api/proveedor", tags=["Rol 2: Proveedor"])


@router.get("/proposals")
def get_provider_proposals(provider_id: int | None = None, db: Session = Depends(get_db)):
    return ProveedorService.list_proposals_and_reports(db, provider_id)


@router.post("/proposals/{proposal_id}/postulate")
def postulate_workers_to_proposal(
    proposal_id: int, req: PostulateSquadRequest, db: Session = Depends(get_db)
):
    return ProveedorService.postulate_squad(db, proposal_id, req)
