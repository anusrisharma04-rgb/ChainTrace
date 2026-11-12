from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.evidence_access import EvidenceAccess
from backend.app.schemas.evidence_access import EvidenceAccessCreate, EvidenceAccessResponse
from backend.app.services.auth_service import get_current_user
from backend.app.models.user import User


router = APIRouter(
    prefix="/evidence-access",
    tags=["Evidence Access Logs"]
)


@router.get("/", response_model=List[EvidenceAccessResponse])
def get_all_access_logs(
    evidence_id: Optional[int] = None,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(EvidenceAccess)
    if evidence_id:
        query = query.filter(EvidenceAccess.evidence_id == evidence_id)
    if user_id:
        query = query.filter(EvidenceAccess.user_id == user_id)
    if action:
        query = query.filter(EvidenceAccess.action == action)
    return query.order_by(EvidenceAccess.access_time.desc()).limit(limit).all()


@router.post("/", response_model=EvidenceAccessResponse)
def log_manual_access(
    access_data: EvidenceAccessCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ip = access_data.ip_address or request.client.host if request.client else "127.0.0.1"
    new_access = EvidenceAccess(
        evidence_id=access_data.evidence_id,
        user_id=access_data.user_id,
        action=access_data.action,
        access_status=access_data.access_status,
        ip_address=ip
    )
    db.add(new_access)
    db.commit()
    db.refresh(new_access)
    return new_access
