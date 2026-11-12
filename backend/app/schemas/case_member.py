from pydantic import BaseModel
from datetime import datetime


class CaseMemberCreate(BaseModel):
    case_id: int
    user_id: int


class CaseMemberResponse(BaseModel):
    case_id: int
    user_id: int
    joined_at: datetime

    class Config:
        from_attributes = True
        