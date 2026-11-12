from pydantic import BaseModel, ConfigDict
from typing import Optional


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    department: Optional[str] = None
    role_id: int


class UserResponse(BaseModel):
    user_id: int
    name: str
    email: str
    department: Optional[str] = None
    role_id: int
    status: str

    model_config = ConfigDict(from_attributes=True)