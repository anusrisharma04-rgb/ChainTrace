
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


class Case(Base):
    __tablename__ = "cases"

    case_id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), nullable=False, unique=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    status = Column(String(30), nullable=False, default="open")

    created_by = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('open', 'under_investigation', 'closed')",
            name="chk_case_status"
        ),
    )
