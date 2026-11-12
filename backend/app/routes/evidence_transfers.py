from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.evidence_transfer import EvidenceTransfer
from backend.app.models.evidence import Evidence
from backend.app.models.user import User
from backend.app.models.location import Location
from backend.app.schemas.evidence_transfer import EvidenceTransferResponse
from backend.app.services.audit_service import log_audit_event
from backend.app.services.auth_service import get_optional_user, require_roles


router = APIRouter(
    prefix="/transfers",
    tags=["Chain of Custody"]
)


class TransferRequest(BaseModel):
    evidence_id: int
    from_user_id: int
    to_user_id: int
    from_location_id: int
    to_location_id: int
    reason: str = Field(..., min_length=3)


@router.post("/")
def create_transfer(
    transfer_data: TransferRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    # Lock the evidence row to prevent concurrent race conditions
    evidence = db.query(Evidence).filter(
        Evidence.evidence_id == transfer_data.evidence_id
    ).with_for_update().first()

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence record not found"
        )

    if evidence.status == "released":
        raise HTTPException(
            status_code=400,
            detail="Released evidence cannot be transferred"
        )

    if evidence.status == "in_transfer":
        raise HTTPException(
            status_code=409,
            detail="Evidence is already marked in transfer"
        )

    # Check for active pending transfers
    pending_transfer = db.query(EvidenceTransfer).filter(
        EvidenceTransfer.evidence_id == transfer_data.evidence_id,
        EvidenceTransfer.authorization_status == "pending"
    ).first()

    if pending_transfer:
        raise HTTPException(
            status_code=409,
            detail="A pending transfer already exists for this evidence"
        )

    if transfer_data.from_user_id == transfer_data.to_user_id:
        raise HTTPException(
            status_code=400,
            detail="Sender and receiver cannot be the same"
        )

    # Validate target user and location exist
    recipient = db.query(User).filter(User.user_id == transfer_data.to_user_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Destination recipient user not found")

    dest_loc = db.query(Location).filter(Location.location_id == transfer_data.to_location_id).first()
    if not dest_loc:
        raise HTTPException(status_code=404, detail="Destination location not found")

    if (
        evidence.current_custodian_id is not None
        and evidence.current_custodian_id != transfer_data.from_user_id
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Sender (ID {transfer_data.from_user_id}) is not the current evidence custodian (ID {evidence.current_custodian_id})"
        )

    if (
        evidence.current_location_id is not None
        and evidence.current_location_id != transfer_data.from_location_id
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Evidence is not at specified source location {transfer_data.from_location_id}"
        )

    transfer = EvidenceTransfer(
        evidence_id=transfer_data.evidence_id,
        previous_evidence_status=evidence.status,
        from_user_id=transfer_data.from_user_id,
        to_user_id=transfer_data.to_user_id,
        from_location_id=transfer_data.from_location_id,
        to_location_id=transfer_data.to_location_id,
        reason=transfer_data.reason,
        authorization_status="pending"
    )

    try:
        db.add(transfer)
        evidence.status = "in_transfer"
        db.flush()

        operator_id = current_user.user_id if current_user else transfer_data.from_user_id
        log_audit_event(
            db=db,
            user_id=operator_id,
            action="TRANSFER_REQUESTED",
            evidence_id=evidence.evidence_id,
            old_value=f"Custodian: {evidence.current_custodian_id}, Loc: {evidence.current_location_id}",
            new_value=f"Pending Transfer to User {transfer_data.to_user_id} at Loc {transfer_data.to_location_id}. Reason: {transfer_data.reason}",
            status="PENDING"
        )

        db.commit()
        db.refresh(transfer)

        return {
            "message": "Transfer request created successfully",
            "transfer_id": transfer.transfer_id,
            "evidence_id": transfer.evidence_id,
            "authorization_status": transfer.authorization_status
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not create transfer request: {str(e)}"
        )


@router.get("/", response_model=List[EvidenceTransferResponse])
def get_transfers(
    authorization_status: Optional[str] = None,
    evidence_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(EvidenceTransfer)
    if authorization_status:
        query = query.filter(EvidenceTransfer.authorization_status == authorization_status)
    if evidence_id:
        query = query.filter(EvidenceTransfer.evidence_id == evidence_id)
    return query.order_by(EvidenceTransfer.transfer_time.desc()).all()


@router.get("/{transfer_id}", response_model=EvidenceTransferResponse)
def get_transfer(
    transfer_id: int,
    db: Session = Depends(get_db)
):
    transfer = db.query(EvidenceTransfer).filter(
        EvidenceTransfer.transfer_id == transfer_id
    ).first()

    if transfer is None:
        raise HTTPException(
            status_code=404,
            detail="Transfer record not found"
        )

    return transfer


@router.patch("/{transfer_id}/approve")
def approve_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    # Lock the transfer and evidence row
    transfer = db.query(EvidenceTransfer).filter(
        EvidenceTransfer.transfer_id == transfer_id
    ).with_for_update().first()

    if transfer is None:
        raise HTTPException(
            status_code=404,
            detail="Transfer record not found"
        )

    if transfer.authorization_status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Transfer has already been processed with status: {transfer.authorization_status}"
        )

    evidence = db.query(Evidence).filter(
        Evidence.evidence_id == transfer.evidence_id
    ).with_for_update().first()

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence record not found"
        )

    old_custodian = evidence.current_custodian_id
    old_location = evidence.current_location_id

    try:
        transfer.authorization_status = "approved"

        evidence.current_custodian_id = transfer.to_user_id
        evidence.current_location_id = transfer.to_location_id
        # Restore previous status (e.g. collected, stored)
        evidence.status = transfer.previous_evidence_status or "stored"

        operator_id = current_user.user_id if current_user else transfer.to_user_id
        log_audit_event(
            db=db,
            user_id=operator_id,
            action="TRANSFER_APPROVED",
            evidence_id=evidence.evidence_id,
            old_value=f"Custodian: {old_custodian}, Location: {old_location}",
            new_value=f"Custodian: {evidence.current_custodian_id}, Location: {evidence.current_location_id}, Status: {evidence.status}",
            status="SUCCESS"
        )

        db.commit()
        db.refresh(transfer)

        return {
            "message": "Transfer approved successfully",
            "transfer_id": transfer.transfer_id,
            "authorization_status": transfer.authorization_status,
            "new_custodian_id": evidence.current_custodian_id,
            "new_location_id": evidence.current_location_id,
            "evidence_status": evidence.status
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not approve transfer: {str(e)}"
        )


@router.patch("/{transfer_id}/reject")
def reject_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    transfer = db.query(EvidenceTransfer).filter(
        EvidenceTransfer.transfer_id == transfer_id
    ).with_for_update().first()

    if transfer is None:
        raise HTTPException(
            status_code=404,
            detail="Transfer record not found"
        )

    if transfer.authorization_status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Transfer has already been processed with status: {transfer.authorization_status}"
        )

    evidence = db.query(Evidence).filter(
        Evidence.evidence_id == transfer.evidence_id
    ).with_for_update().first()

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence record not found"
        )

    try:
        transfer.authorization_status = "rejected"
        # Custodian and location remain unchanged; restore previous status
        evidence.status = transfer.previous_evidence_status or "stored"

        operator_id = current_user.user_id if current_user else transfer.from_user_id
        log_audit_event(
            db=db,
            user_id=operator_id,
            action="TRANSFER_REJECTED",
            evidence_id=evidence.evidence_id,
            old_value="Transfer status: pending",
            new_value="Transfer rejected. Custody remains unchanged.",
            status="REJECTED"
        )

        db.commit()
        db.refresh(transfer)

        return {
            "message": "Transfer rejected successfully",
            "transfer_id": transfer.transfer_id,
            "authorization_status": transfer.authorization_status,
            "evidence_status": evidence.status
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not reject transfer: {str(e)}"
        )
