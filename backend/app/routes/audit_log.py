from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database.connection import get_db
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.audit_log import AuditLogResponse


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"]
)


@router.get("/", response_model=List[AuditLogResponse])
def get_audit_logs(
    user_id: Optional[int] = None,
    evidence_id: Optional[int] = None,
    action: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 150,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if evidence_id:
        query = query.filter(AuditLog.evidence_id == evidence_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if status:
        query = query.filter(AuditLog.status == status)
    return query.order_by(AuditLog.event_timestamp.desc()).limit(limit).all()


@router.get("/stats")
def get_audit_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    total_logs = db.query(func.count(AuditLog.audit_id)).scalar() or 0
    
    actions_breakdown = (
        db.query(AuditLog.action, func.count(AuditLog.audit_id))
        .group_by(AuditLog.action)
        .all()
    )
    
    status_breakdown = (
        db.query(AuditLog.status, func.count(AuditLog.audit_id))
        .group_by(AuditLog.status)
        .all()
    )
    
    return {
        "total_audit_events": total_logs,
        "actions": {act: count for act, count in actions_breakdown},
        "status": {st: count for st, count in status_breakdown}
    }
