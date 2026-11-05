from fastapi import HTTPException
from sqlalchemy import and_, or_, update
from sqlalchemy.orm import Session
from app.models.proposal import Proposal
from app.models.worker import WorkerProfile
from app.repositories.proposal_repository import ProposalRepository
from app.repositories.user_repository import UserRepository
from app.repositories.worker_repository import WorkerRepository
from app.schemas.proposal_schema import PostulateSquadRequest
from app.services.minera_service import serialize_proposal


class ProveedorService:
    @staticmethod
    def _assert_can_postulate(proposal: Proposal, provider_id: int) -> None:
        if proposal.status == "ACEPTADA":
            raise HTTPException(
                status_code=400, detail="La convocatoria ya fue aceptada y cerrada."
            )
        if proposal.status == "POSTULADA" and proposal.provider_id != provider_id:
            raise HTTPException(
                status_code=409,
                detail="La convocatoria ya cuenta con una postulación activa de otro contratista.",
            )

    @staticmethod
    def list_proposals_and_reports(db: Session, provider_id: int) -> dict:
        """Solo convocatorias ABIERTAS y las propias del contratista (cualquier estado)."""
        proposals = ProposalRepository.list_all(db)
        serialized = [serialize_proposal(p) for p in proposals]

        provider_proposals = [
            p
            for p in serialized
            if p["status"] == "ABIERTA" or p["provider_id"] == provider_id
        ]
        reports = [
            p
            for p in serialized
            if p["provider_id"] == provider_id and p["report_sent"]
        ]
        return {
            "proposals": provider_proposals,
            "reports": reports,
        }

    @staticmethod
    def postulate_squad(
        db: Session, proposal_id: int, req: PostulateSquadRequest, provider_id: int
    ) -> dict:
        proposal = ProposalRepository.get_by_id(db, proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Convocatoria no encontrada.")

        ProveedorService._assert_can_postulate(proposal, provider_id)

        if len(req.workers) == 0:
            raise HTTPException(
                status_code=400,
                detail="Debe incluir la nómina de trabajadores para postular.",
            )

        # Reclamo atómico: el UPDATE condicional evita que dos contratistas pasen la
        # validación a la vez sobre una convocatoria ABIERTA (check-then-write race).
        claimed = db.execute(
            update(Proposal)
            .where(
                Proposal.id == proposal.id,
                or_(
                    Proposal.status == "ABIERTA",
                    and_(
                        Proposal.status == "POSTULADA",
                        Proposal.provider_id == provider_id,
                    ),
                ),
            )
            .values(status="POSTULADA", provider_id=provider_id)
        )
        if claimed.rowcount != 1:
            db.rollback()
            db.refresh(proposal)
            ProveedorService._assert_can_postulate(proposal, provider_id)
            raise HTTPException(
                status_code=409,
                detail="La convocatoria ya cuenta con una postulación activa de otro contratista.",
            )
        db.refresh(proposal)

        provider = UserRepository.get_by_id(db, provider_id)
        company_name = (
            provider.company_name
            if provider and provider.company_name
            else "Contratistas Mineros del Sur S.A.C."
        )

        WorkerRepository.delete_by_proposal_id(db, proposal.id)

        for w in req.workers:
            worker = WorkerProfile(
                proposal_id=proposal.id,
                first_name=w.first_name.strip(),
                last_name=w.last_name.strip(),
                dni=w.dni.strip(),
                email=w.email.strip(),
                position=w.position.strip(),
            )
            db.add(worker)

        proposal.provider_company_name = company_name

        db.commit()
        db.refresh(proposal)

        return {
            "message": f"Cuadrilla de {len(req.workers)} trabajadores enviada exitosamente a la Minera.",
            "proposal": serialize_proposal(proposal),
        }
