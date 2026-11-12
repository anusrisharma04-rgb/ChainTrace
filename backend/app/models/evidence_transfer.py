from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, CheckConstraint, func
from sqlalchemy import (
    Column, Integer, String, Text, DateTime,
    ForeignKey, CheckConstraint, func
)

from backend.app.database.connection import Base


class EvidenceTransfer(Base):
    __tablename__ = "evidence_transfer"
    previous_evidence_status = Column(
    String(30),
    nullable=True
)

    transfer_id = Column(Integer, primary_key=True, index=True)

    evidence_id = Column(
        Integer, ForeignKey("evidence.evidence_id"), nullable=False
    )

    from_user_id = Column(
        Integer, ForeignKey("users.user_id"), nullable=False
    )

    to_user_id = Column(
        Integer, ForeignKey("users.user_id"), nullable=False
    )

    from_location_id = Column(
        Integer, ForeignKey("locations.location_id"), nullable=False
    )

    to_location_id = Column(
        Integer, ForeignKey("locations.location_id"), nullable=False
    )

    transfer_time = Column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    reason = Column(Text, nullable=False)

    authorization_status = Column(
        String(30), nullable=False, default="pending"
    )

    __table_args__ = (
        CheckConstraint(
            "authorization_status IN ('pending', 'approved', 'rejected')",
            name="chk_transfer_authorization"
        ),
    )
