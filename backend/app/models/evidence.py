
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    CheckConstraint,
    func
)

from backend.app.database.connection import Base


class Evidence(Base):
    __tablename__ = "evidence"

    evidence_id = Column(Integer, primary_key=True, index=True)

    case_id = Column(
        Integer,
        ForeignKey("cases.case_id"),
        nullable=False
    )

    evidence_type = Column(String(100), nullable=False)

    description = Column(Text, nullable=True)

    serial_number = Column(String(100), nullable=True)

    collection_time = Column(DateTime, nullable=False)

    collected_by = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False
    )

    current_location_id = Column(
        Integer,
        ForeignKey("locations.location_id"),
        nullable=True
    )

    current_custodian_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="collected"
    )

    original_hash = Column(String(128), nullable=False)
    file_path = Column(Text, nullable=True)


    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('collected', 'in_transfer', 'stored', 'under_examination', 'released')",
            name="chk_evidence_status"
        ),
    )
