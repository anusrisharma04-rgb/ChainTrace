from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EvidenceAccessCreate(BaseModel):
    evidence_id: int
    user_id: int
    action: str
    access_status: str
    ip_address: Optional[str] = None


class EvidenceAccessResponse(BaseModel):
    access_id: int
    evidence_id: int
    user_id: int
    action: str
    access_time: datetime
    access_status: str
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True
        