from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.user import User
from backend.app.models.role import Role
from backend.app.services.auth_service import (
    verify_password,
    create_access_token,
    get_current_user
)
from backend.app.services.audit_service import log_audit_event


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


class LoginRequest(BaseModel):
    email: str
    password: str


class UserInfo(BaseModel):
    user_id: int
    name: str
    email: str
    role_id: int
    role_name: str
    department: str = ""
    status: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo


@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check password
    if not verify_password(credentials.password, user.password_hash):
        log_audit_event(
            db=db,
            user_id=user.user_id,
            action="USER_LOGIN_FAILED",
            new_value=f"Failed login attempt for {user.email}",
            status="FAILED"
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended or inactive"
        )

    role = db.query(Role).filter(Role.role_id == user.role_id).first()
    role_name = role.role_name if role else "User"

    access_token = create_access_token(
        data={"sub": str(user.user_id), "role": role_name, "email": user.email}
    )

    log_audit_event(
        db=db,
        user_id=user.user_id,
        action="USER_LOGIN_SUCCESS",
        new_value=f"User {user.email} logged in successfully",
        status="SUCCESS"
    )
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role_id": user.role_id,
            "role_name": role_name,
            "department": user.department or "",
            "status": user.status
        }
    }


@router.get("/me", response_model=UserInfo)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.role_id == current_user.role_id).first()
    return {
        "user_id": current_user.user_id,
        "name": current_user.name,
        "email": current_user.email,
        "role_id": current_user.role_id,
        "role_name": role.role_name if role else "User",
        "department": current_user.department or "",
        "status": current_user.status
    }


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log_audit_event(
        db=db,
        user_id=current_user.user_id,
        action="USER_LOGOUT",
        new_value=f"User {current_user.email} logged out",
        status="SUCCESS"
    )
    db.commit()
    return {"message": "Logged out successfully"}
