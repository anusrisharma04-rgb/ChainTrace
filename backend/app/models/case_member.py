
from sqlalchemy import Column, Integer, DateTime, ForeignKey, func

from backend.app.database.connection import Base


class CaseMember(Base):
    __tablename__ = "case_members"

    case_id = Column(
        Integer,
        ForeignKey("cases.case_id", ondelete="CASCADE"),
        primary_key=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True
    )

    joined_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp()
    )

