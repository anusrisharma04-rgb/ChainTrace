
from sqlalchemy import (
    Column, Integer, String, Text, DateTime,
    ForeignKey, func
)

from backend.app.database.connection import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    audit_id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False
    )

    evidence_id = Column(
        Integer,
        ForeignKey("evidence.evidence_id"),
        nullable=True
    )

    action = Column(String(100), nullable=False)

    event_timestamp = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp()
    )

    old_value = Column(Text, nullable=True)

    new_value = Column(Text, nullable=True)

    status = Column(String(30), nullable=False)
