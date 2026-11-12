from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.location import Location
from backend.app.schemas.location import LocationCreate, LocationResponse


router = APIRouter(
    prefix="/locations",
    tags=["Locations"]
)


@router.post("/", response_model=LocationResponse)
def create_location(location: LocationCreate, db: Session = Depends(get_db)):

    new_location = Location(
        location_name=location.location_name,
        location_type=location.location_type,
        description=location.description
    )

    db.add(new_location)
    db.commit()
    db.refresh(new_location)

    return new_location


@router.get("/", response_model=list[LocationResponse])
def get_locations(db: Session = Depends(get_db)):
    return db.query(Location).all()


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(location_id: int, db: Session = Depends(get_db)):

    location = db.query(Location).filter(
        Location.location_id == location_id
    ).first()

    if not location:
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )

    return location