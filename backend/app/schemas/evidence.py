from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EvidenceCreate(BaseModel):
    case_id: int
    evidence_type: str
    description: Optional[str] = None
    serial_number: Optional[str] = None
    collection_time: datetime
    collected_by: int
    current_location_id: Optional[int] = None
    current_custodian_id: Optional[int] = None


class EvidenceResponse(BaseModel):
    evidence_id: int
    case_id: int
    evidence_type: str
    description: Optional[str] = None
    serial_number: Optional[str] = None
    collection_time: datetime
    collected_by: int
    current_location_id: Optional[int] = None
    current_custodian_id: Optional[int] = None
    status: str
    original_hash: str
    file_path: Optional[str] = None
    created_at: datetime
    

    class Config:
        from_attributes = True