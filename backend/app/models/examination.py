
from sqlalchemy import (
    Column, Integer, String, Text, DateTime,
    ForeignKey, CheckConstraint
)

from backend.app.database.connection import Base


class Examination(Base):
    __tablename__ = "examination"

    examination_id = Column(
        Integer, primary_key=True, index=True
    )

    evidence_id = Column(
        Integer,
        ForeignKey("evidence.evidence_id"),
        nullable=False
    )

    analyst_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False
    )

    start_time = Column(DateTime, nullable=False)

    end_time = Column(DateTime, nullable=True)

    tool_used = Column(String(150), nullable=True)

    purpose = Column(Text, nullable=False)

    findings = Column(Text, nullable=True)

    result = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "end_time IS NULL OR end_time >= start_time",
            name="chk_examination_time"
        ),
    )
