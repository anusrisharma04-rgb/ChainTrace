from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.database.connection import get_db
from backend.app.models.case import Case
from backend.app.models.case_member import CaseMember
from backend.app.models.evidence import Evidence
from backend.app.models.user import User
from backend.app.schemas.case import CaseCreate, CaseResponse
from backend.app.schemas.evidence import EvidenceResponse
from backend.app.services.audit_service import log_audit_event
from backend.app.services.auth_service import get_optional_user


router = APIRouter(
    prefix="/cases",
    tags=["Cases"]
)


@router.get("/summary/stats")
def get_cases_summary_stats(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM v_case_forensic_summary")).mappings().all()
    return [dict(r) for r in rows]


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


@router.post("/", response_model=CaseResponse)
def create_case(
    case: CaseCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    existing_case = db.query(Case).filter(
        Case.case_number == case.case_number
    ).first()

    if existing_case:
        raise HTTPException(
            status_code=409,
            detail="Case number already exists"
        )

    creator = db.query(User).filter(
        User.user_id == case.created_by
    ).first()

    if not creator:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    new_case = Case(
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        created_by=case.created_by
    )

    db.add(new_case)
    db.flush()

    # Automatically assign creator as first case member
    creator_member = CaseMember(
        case_id=new_case.case_id,
        user_id=case.created_by
    )
    db.add(creator_member)

    # Log audit event
    operator_id = current_user.user_id if current_user else case.created_by
    log_audit_event(
        db=db,
        user_id=operator_id,
        action="CASE_CREATED",
        new_value=f"Case {new_case.case_number}: '{new_case.title}' created",
        status="SUCCESS"
    )

    db.commit()
    db.refresh(new_case)

    return new_case


@router.get("/", response_model=List[CaseResponse])
def get_cases(db: Session = Depends(get_db)):
    return db.query(Case).order_by(Case.case_id.desc()).all()


@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(
        Case.case_id == case_id
    ).first()

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    return case


@router.put("/{case_id}", response_model=CaseResponse)
def update_case(
    case_id: int,
    case_update: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    old_status = case.status
    old_title = case.title

    if case_update.title is not None:
        case.title = case_update.title
    if case_update.description is not None:
        case.description = case_update.description
    if case_update.status is not None:
        if case_update.status not in ("open", "under_investigation", "closed"):
            raise HTTPException(status_code=400, detail="Invalid status value")
        case.status = case_update.status

    operator_id = current_user.user_id if current_user else case.created_by
    log_audit_event(
        db=db,
        user_id=operator_id,
        action="CASE_UPDATED",
        old_value=f"Status: {old_status}, Title: {old_title}",
        new_value=f"Status: {case.status}, Title: {case.title}",
        status="SUCCESS"
    )

    db.commit()
    db.refresh(case)
    return case


@router.get("/{case_id}/evidence", response_model=List[EvidenceResponse])
def get_evidence_for_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    return db.query(Evidence).filter(Evidence.case_id == case_id).all()


@router.get("/{case_id}/members")
def get_case_members_details(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    memberships = (
        db.query(CaseMember, User)
        .join(User, CaseMember.user_id == User.user_id)
        .filter(CaseMember.case_id == case_id)
        .all()
    )

    result = []
    for cm, u in memberships:
        result.append({
            "case_id": cm.case_id,
            "user_id": u.user_id,
            "name": u.name,
            "email": u.email,
            "department": u.department or "",
            "role_id": u.role_id,
            "joined_at": cm.joined_at
        })
    return result
