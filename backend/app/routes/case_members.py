from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.case_member import CaseMember
from backend.app.models.case import Case
from backend.app.models.user import User
from backend.app.schemas.case_member import (
    CaseMemberCreate,
    CaseMemberResponse
)


router = APIRouter(
    prefix="/case-members",
    tags=["Case Members"]
)


@router.post("/", response_model=CaseMemberResponse)
def add_case_member(
    membership: CaseMemberCreate,
    db: Session = Depends(get_db)
):

    case = db.query(Case).filter(
        Case.case_id == membership.case_id
    ).first()

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    user = db.query(User).filter(
        User.user_id == membership.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    existing = db.query(CaseMember).filter(
        CaseMember.case_id == membership.case_id,
        CaseMember.user_id == membership.user_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="User is already assigned to this case"
        )

    new_membership = CaseMember(
        case_id=membership.case_id,
        user_id=membership.user_id
    )

    db.add(new_membership)
    db.commit()
    db.refresh(new_membership)

    return new_membership


@router.get("/{case_id}", response_model=list[CaseMemberResponse])
def get_case_members(case_id: int, db: Session = Depends(get_db)):

    case = db.query(Case).filter(
        Case.case_id == case_id
    ).first()

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    return db.query(CaseMember).filter(
        CaseMember.case_id == case_id
    ).all()


@router.delete("/{case_id}/{user_id}")
def remove_case_member(
    case_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):

    membership = db.query(CaseMember).filter(
        CaseMember.case_id == case_id,
        CaseMember.user_id == user_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Case membership not found"
        )

    db.delete(membership)
    db.commit()

    return {"message": "Case member removed successfully"}