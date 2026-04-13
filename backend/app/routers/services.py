import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.service_record import ServiceRecord
from app.models.vehicle import Vehicle
from app.schemas.service_record import ServiceRecordCreate, ServiceRecordUpdate, ServiceRecordResponse
from app.services.planning_engine import create_planned_services_from_record
from app.config import settings

router = APIRouter(prefix="/services", tags=["services"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _get_record_or_404(record_id: int, db: Session) -> ServiceRecord:
    record = db.get(ServiceRecord, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Service record {record_id} not found")
    return record


def _validate_image_ext(filename: str) -> str:
    ext = Path(filename).suffix.lower() if filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    return ext


@router.get("", response_model=List[ServiceRecordResponse])
def list_service_records(
    vehicle_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(ServiceRecord)
    if vehicle_id is not None:
        query = query.filter(ServiceRecord.vehicle_id == vehicle_id)
    return query.order_by(ServiceRecord.date.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=ServiceRecordResponse, status_code=status.HTTP_201_CREATED)
def create_service_record(payload: ServiceRecordCreate, db: Session = Depends(get_db)):
    # Verify vehicle exists
    vehicle = db.get(Vehicle, payload.vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail=f"Vehicle {payload.vehicle_id} not found")

    record = ServiceRecord(**payload.model_dump())
    db.add(record)
    db.flush()  # Get the ID

    # Update maintenance plans and create new planned services
    create_planned_services_from_record(
        db=db,
        vehicle_id=payload.vehicle_id,
        tasks=payload.tasks,
        km_at_service=payload.km_at_service,
        service_date=payload.date,
    )

    db.commit()
    db.refresh(record)
    return record


@router.get("/{record_id}", response_model=ServiceRecordResponse)
def get_service_record(record_id: int, db: Session = Depends(get_db)):
    return _get_record_or_404(record_id, db)


@router.put("/{record_id}", response_model=ServiceRecordResponse)
def update_service_record(
    record_id: int,
    payload: ServiceRecordUpdate,
    db: Session = Depends(get_db),
):
    record = _get_record_or_404(record_id, db)
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service_record(record_id: int, db: Session = Depends(get_db)):
    record = _get_record_or_404(record_id, db)
    db.delete(record)
    db.commit()


@router.post("/{record_id}/photos", response_model=ServiceRecordResponse)
async def upload_photos(
    record_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    record = _get_record_or_404(record_id, db)

    save_dir = Path(settings.upload_path) / "services" / str(record_id)
    save_dir.mkdir(parents=True, exist_ok=True)

    current_photos: list = list(record.photos or [])

    for file in files:
        ext = _validate_image_ext(file.filename or "")
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File '{file.filename}' too large (max 10 MB)")

        filename = f"{uuid.uuid4()}{ext}"
        save_path = save_dir / filename
        with open(save_path, "wb") as f:
            f.write(content)

        relative_path = str(Path("services") / str(record_id) / filename)
        current_photos.append(relative_path)

    record.photos = current_photos
    db.commit()
    db.refresh(record)
    return record


@router.get("/{record_id}/photos", response_model=List[str])
def get_photos(record_id: int, db: Session = Depends(get_db)):
    record = _get_record_or_404(record_id, db)
    return record.photos or []


@router.delete("/{record_id}/photos/{filename}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(record_id: int, filename: str, db: Session = Depends(get_db)):
    record = _get_record_or_404(record_id, db)

    # Find matching photo in record's photo list
    current_photos: list = list(record.photos or [])
    relative_path = str(Path("services") / str(record_id) / filename)

    if relative_path not in current_photos:
        raise HTTPException(status_code=404, detail=f"Photo '{filename}' not found")

    # Remove the physical file
    full_path = Path(settings.upload_path) / relative_path
    if full_path.exists():
        full_path.unlink()

    current_photos.remove(relative_path)
    record.photos = current_photos
    db.commit()
