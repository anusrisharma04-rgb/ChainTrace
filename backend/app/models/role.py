
from sqlalchemy import Column, Integer, String, Text

from backend.app.database.connection import Base


class Role(Base):
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), nullable=False, unique=True)
    description = Column(Text, nullable=True)

