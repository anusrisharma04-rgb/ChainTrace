from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ExaminationCreate(BaseModel):
    evidence_id: int
    analyst_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    tool_used: Optional[str] = None
    purpose: str
    findings: Optional[str] = None
    result: Optional[str] = None


class ExaminationResponse(BaseModel):
    examination_id: int
    evidence_id: int
    analyst_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    tool_used: Optional[str] = None
    purpose: str
    findings: Optional[str] = None
    result: Optional[str] = None

    class Config:
        from_attributes = True