import datetime
from typing import Optional
from sqlalchemy.orm import Session
from backend.app.models.evidence_access import EvidenceAccess


def log_evidence_access(
    db: Session,
    evidence_id: int,
    user_id: int,
    action: str,
    access_status: str = "granted",
    ip_address: Optional[str] = None
) -> EvidenceAccess:
    """
    Records an access event into the evidence_access table.
    """
    access_entry = EvidenceAccess(
        evidence_id=evidence_id,
        user_id=user_id,
        action=action,
        access_status=access_status,
        ip_address=ip_address,
        access_time=datetime.datetime.utcnow()
    )
    db.add(access_entry)
    db.flush()
    return access_entry
