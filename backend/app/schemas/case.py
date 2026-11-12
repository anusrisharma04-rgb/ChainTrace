from pydantic import BaseModel
from typing import Optional


class CaseCreate(BaseModel):
    case_number: str
    title: str
    description: Optional[str] = None
    created_by: int


class CaseResponse(BaseModel):
    case_id: int
    case_number: str
    title: str
    description: Optional[str] = None
    status: str
    created_by: int

    class Config:
        from_attributes = True