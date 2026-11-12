
from sqlalchemy import Column, Integer, String, Text

from backend.app.database.connection import Base


class Location(Base):
    __tablename__ = "locations"

    location_id = Column(Integer, primary_key=True, index=True)

    location_name = Column(String(150), nullable=False)

    location_type = Column(String(50), nullable=False)

    description = Column(Text, nullable=True)
