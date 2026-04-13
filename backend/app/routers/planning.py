from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.planned_service import PlannedService
from app.schemas.dashboard import UpcomingService
from app.schemas.planned_service import PlannedServiceResponse, PlannedServiceStatusUpdate
from app.services.planning_engine import get_upcoming_services

router = APIRouter(prefix="/planning", tags=["planning"])

VALID_STATUSES = {"pending", "done", "skipped"}


@router.get("/upcoming", response_model=List[UpcomingService])
def get_upcoming(
    days: int = Query(60, ge=0),
    km_threshold: int = Query(1000, ge=0),
    db: Session = Depends(get_db),
):
    items = get_upcoming_services(db, days=days, km_threshold=km_threshold)
    return [UpcomingService(**item) for item in items]


@router.patch("/{planned_service_id}/status", response_model=PlannedServiceResponse)
def update_planned_service_status(
    planned_service_id: int,
    payload: PlannedServiceStatusUpdate,
    db: Session = Depends(get_db),
):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Allowed: {', '.join(VALID_STATUSES)}",
        )

    ps = db.get(PlannedService, planned_service_id)
    if ps is None:
        raise HTTPException(status_code=404, detail=f"Planned service {planned_service_id} not found")

    ps.status = payload.status
    db.commit()
    db.refresh(ps)
    return ps
