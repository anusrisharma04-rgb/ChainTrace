from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.role import Role
from backend.app.schemas.role import RoleCreate, RoleResponse


router = APIRouter(
    prefix="/roles",
    tags=["Roles"]
)


@router.post("/", response_model=RoleResponse)
def create_role(role: RoleCreate, db: Session = Depends(get_db)):

    existing_role = db.query(Role).filter(
        Role.role_name == role.role_name
    ).first()

    if existing_role:
        raise HTTPException(
            status_code=409,
            detail="Role already exists"
        )

    new_role = Role(
        role_name=role.role_name,
        description=role.description
    )

    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    return new_role


@router.get("/", response_model=list[RoleResponse])
def get_roles(db: Session = Depends(get_db)):
    return db.query(Role).all()
