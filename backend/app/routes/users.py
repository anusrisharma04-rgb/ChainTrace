from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.user import User
from backend.app.models.role import Role
from backend.app.schemas.user import UserCreate, UserResponse
from backend.app.services.auth_service import (
    password_hasher,
    get_optional_user,
    require_roles
)
from backend.app.services.audit_service import log_audit_event


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    role_id: Optional[int] = None
    status: Optional[str] = None


@router.post("/", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    role = db.query(Role).filter(
        Role.role_id == user.role_id
    ).first()

    if not role:
        raise HTTPException(
            status_code=404,
            detail="Role not found"
        )

    hashed_password = password_hasher.hash(user.password)

    new_user = User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password,
        department=user.department,
        role_id=user.role_id,
        status="active"
    )

    db.add(new_user)
    db.flush()

    operator_id = current_user.user_id if current_user else new_user.user_id
    log_audit_event(
        db=db,
        user_id=operator_id,
        action="USER_CREATED",
        new_value=f"User {new_user.email} created with Role ID {new_user.role_id}",
        status="SUCCESS"
    )

    db.commit()
    db.refresh(new_user)

    return new_user


@router.get("/", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.user_id.asc()).all()


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_status = user.status
    old_role = user.role_id

    if user_data.name is not None:
        user.name = user_data.name
    if user_data.department is not None:
        user.department = user_data.department
    if user_data.role_id is not None:
        role = db.query(Role).filter(Role.role_id == user_data.role_id).first()
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        user.role_id = user_data.role_id
    if user_data.status is not None:
        if user_data.status not in ("active", "inactive", "suspended"):
            raise HTTPException(status_code=400, detail="Invalid status")
        user.status = user_data.status

    operator_id = current_user.user_id if current_user else user.user_id
    log_audit_event(
        db=db,
        user_id=operator_id,
        action="USER_UPDATED",
        old_value=f"Role: {old_role}, Status: {old_status}",
        new_value=f"Role: {user.role_id}, Status: {user.status}",
        status="SUCCESS"
    )

    db.commit()
    db.refresh(user)
    return user
