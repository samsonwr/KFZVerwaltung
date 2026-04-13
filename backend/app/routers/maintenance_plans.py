from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.maintenance_plan import MaintenancePlan
from app.models.vehicle import Vehicle
from app.schemas.maintenance_plan import (
    MaintenancePlanCreate,
    MaintenancePlanUpdate,
    MaintenancePlanResponse,
)
from app.services.planning_engine import ensure_planned_service_for_plan

router = APIRouter(tags=["maintenance-plans"])


def _get_vehicle_or_404(vehicle_id: int, db: Session) -> Vehicle:
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
    return vehicle


def _get_plan_or_404(plan_id: int, vehicle_id: int, db: Session) -> MaintenancePlan:
    plan = db.query(MaintenancePlan).filter(
        MaintenancePlan.id == plan_id,
        MaintenancePlan.vehicle_id == vehicle_id,
    ).first()
    if plan is None:
        raise HTTPException(
            status_code=404,
            detail=f"Maintenance plan {plan_id} not found for vehicle {vehicle_id}",
        )
    return plan


@router.get(
    "/vehicles/{vehicle_id}/maintenance-plans",
    response_model=List[MaintenancePlanResponse],
)
def list_maintenance_plans(vehicle_id: int, db: Session = Depends(get_db)):
    _get_vehicle_or_404(vehicle_id, db)
    return db.query(MaintenancePlan).filter(MaintenancePlan.vehicle_id == vehicle_id).all()


@router.post(
    "/vehicles/{vehicle_id}/maintenance-plans",
    response_model=MaintenancePlanResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_maintenance_plan(
    vehicle_id: int,
    payload: MaintenancePlanCreate,
    db: Session = Depends(get_db),
):
    vehicle = _get_vehicle_or_404(vehicle_id, db)
    plan = MaintenancePlan(vehicle_id=vehicle_id, **payload.model_dump())
    db.add(plan)
    db.flush()  # ID vergeben ohne commit
    ensure_planned_service_for_plan(plan, vehicle, db)
    db.commit()
    db.refresh(plan)
    return plan


@router.put(
    "/vehicles/{vehicle_id}/maintenance-plans/{plan_id}",
    response_model=MaintenancePlanResponse,
)
def update_maintenance_plan(
    vehicle_id: int,
    plan_id: int,
    payload: MaintenancePlanUpdate,
    db: Session = Depends(get_db),
):
    vehicle = _get_vehicle_or_404(vehicle_id, db)
    plan = _get_plan_or_404(plan_id, vehicle_id, db)
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(plan, key, value)
    db.flush()
    ensure_planned_service_for_plan(plan, vehicle, db)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete(
    "/vehicles/{vehicle_id}/maintenance-plans/{plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_maintenance_plan(
    vehicle_id: int,
    plan_id: int,
    db: Session = Depends(get_db),
):
    plan = _get_plan_or_404(plan_id, vehicle_id, db)
    db.delete(plan)
    db.commit()
