from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AuditLogCreate(BaseModel):
    user_id: int
    evidence_id: Optional[int] = None
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    status: str


class AuditLogResponse(BaseModel):
    audit_id: int
    user_id: int
    evidence_id: Optional[int] = None
    action: str
    event_timestamp: datetime
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    status: str

    class Config:
        from_attributes = True
        