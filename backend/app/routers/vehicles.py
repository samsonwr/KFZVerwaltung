import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vehicle import Vehicle
from app.models.km_history import KmHistory
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse, VehicleKmUpdate
from app.schemas.km_history import KmHistoryResponse
from app.config import settings

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _get_vehicle_or_404(vehicle_id: int, db: Session) -> Vehicle:
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
    return vehicle


def _validate_image(file: UploadFile) -> str:
    ext = Path(file.filename).suffix.lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    return ext


@router.get("", response_model=List[VehicleResponse])
def list_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).all()


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: VehicleCreate, db: Session = Depends(get_db)):
    vehicle = Vehicle(**payload.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    return _get_vehicle_or_404(vehicle_id, db)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(vehicle_id: int, payload: VehicleUpdate, db: Session = Depends(get_db)):
    vehicle = _get_vehicle_or_404(vehicle_id, db)
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vehicle, key, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = _get_vehicle_or_404(vehicle_id, db)
    db.delete(vehicle)
    db.commit()


@router.post("/{vehicle_id}/km", response_model=VehicleResponse)
def update_km(vehicle_id: int, payload: VehicleKmUpdate, db: Session = Depends(get_db)):
    vehicle = _get_vehicle_or_404(vehicle_id, db)
    vehicle.current_km = payload.km
    entry = KmHistory(
        vehicle_id=vehicle_id,
        km=payload.km,
        reported_at=datetime.now(timezone.utc),
        note=payload.note,
    )
    db.add(entry)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.get("/{vehicle_id}/km-history", response_model=List[KmHistoryResponse])
def get_km_history(vehicle_id: int, db: Session = Depends(get_db)):
    _get_vehicle_or_404(vehicle_id, db)
    return (
        db.query(KmHistory)
        .filter(KmHistory.vehicle_id == vehicle_id)
        .order_by(KmHistory.reported_at.desc())
        .limit(50)
        .all()
    )


@router.post("/{vehicle_id}/photo", response_model=VehicleResponse)
async def upload_photo(
    vehicle_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    vehicle = _get_vehicle_or_404(vehicle_id, db)
    ext = _validate_image(file)

    # Check file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    # Save file
    save_dir = Path(settings.upload_path) / "vehicles" / str(vehicle_id)
    save_dir.mkdir(parents=True, exist_ok=True)
    filename = f"photo{ext}"
    save_path = save_dir / filename

    with open(save_path, "wb") as f:
        f.write(content)

    # Store relative path
    relative_path = str(Path("vehicles") / str(vehicle_id) / filename)
    vehicle.photo_path = relative_path
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.post("/{vehicle_id}/registration-doc", response_model=VehicleResponse)
async def upload_registration_doc(
    vehicle_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    vehicle = _get_vehicle_or_404(vehicle_id, db)
    ext = _validate_image(file)

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    save_dir = Path(settings.upload_path) / "vehicles" / str(vehicle_id)
    save_dir.mkdir(parents=True, exist_ok=True)
    filename = f"registration_doc{ext}"
    save_path = save_dir / filename

    with open(save_path, "wb") as f:
        f.write(content)

    relative_path = str(Path("vehicles") / str(vehicle_id) / filename)
    vehicle.registration_doc_path = relative_path
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.get("/{vehicle_id}/photo")
def get_photo(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = _get_vehicle_or_404(vehicle_id, db)
    if not vehicle.photo_path:
        raise HTTPException(status_code=404, detail="No photo available for this vehicle")

    full_path = Path(settings.upload_path) / vehicle.photo_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Photo file not found")

    return FileResponse(str(full_path))
