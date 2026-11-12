import datetime
from typing import Optional
from sqlalchemy.orm import Session
from backend.app.models.audit_log import AuditLog


def log_audit_event(
    db: Session,
    user_id: int,
    action: str,
    evidence_id: Optional[int] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    status: str = "SUCCESS"
) -> AuditLog:
    """
    Records an immutable audit trail entry into the audit_log table.
    """
    audit_entry = AuditLog(
        user_id=user_id,
        evidence_id=evidence_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
        status=status,
        event_timestamp=datetime.datetime.utcnow()
    )
    db.add(audit_entry)
    db.flush()
    return audit_entry
