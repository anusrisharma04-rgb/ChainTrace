from pydantic import BaseModel
from typing import Optional


class LocationCreate(BaseModel):
    location_name: str
    location_type: str
    description: Optional[str] = None


class LocationResponse(BaseModel):
    location_id: int
    location_name: str
    location_type: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
        