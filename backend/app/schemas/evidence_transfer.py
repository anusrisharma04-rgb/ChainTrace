from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EvidenceTransferCreate(BaseModel):
    evidence_id: int
    from_user_id: int
    to_user_id: int
    from_location_id: int
    to_location_id: int
    reason: str


class EvidenceTransferResponse(BaseModel):
    transfer_id: int
    evidence_id: int
    from_user_id: int
    to_user_id: int
    from_location_id: int
    to_location_id: int
    transfer_time: datetime
    reason: str
    authorization_status: str

    class Config:
        from_attributes = True
        