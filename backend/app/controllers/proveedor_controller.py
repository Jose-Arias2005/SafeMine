from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.proposal_schema import PostulateSquadRequest
from app.services.proveedor_service import ProveedorService

router = APIRouter(prefix="/api/proveedor", tags=["Rol 2: Proveedor"])


@router.get("/proposals")
def get_provider_proposals(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["PROVEEDOR"])),
):
    # La identidad sale del token; cualquier `?provider_id=` en la query se ignora.
    return ProveedorService.list_proposals_and_reports(db, current_user.id)


@router.post("/proposals/{proposal_id}/postulate")
def postulate_workers_to_proposal(
    proposal_id: int,
    req: PostulateSquadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["PROVEEDOR"])),
):
    return ProveedorService.postulate_squad(db, proposal_id, req, current_user.id)
