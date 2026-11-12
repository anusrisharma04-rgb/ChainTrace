
from sqlalchemy import (
    Column, Integer, String, DateTime,
    ForeignKey, CheckConstraint, func
)

from backend.app.database.connection import Base


class EvidenceAccess(Base):
    __tablename__ = "evidence_access"

    access_id = Column(Integer, primary_key=True, index=True)

    evidence_id = Column(
        Integer,
        ForeignKey("evidence.evidence_id"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False
    )

    action = Column(String(100), nullable=False)

    access_time = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp()
    )

    access_status = Column(String(30), nullable=False)

    ip_address = Column(String(45), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "access_status IN ('granted', 'denied')",
            name="chk_access_status"
        ),
    )
