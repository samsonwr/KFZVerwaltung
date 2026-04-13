from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vehicle import Vehicle
from app.models.service_record import ServiceRecord
from app.models.planned_service import PlannedService
from app.schemas.dashboard import DashboardSummary, VehicleSummary, UpcomingService
from app.schemas.vehicle import VehicleResponse
from app.services.planning_engine import calculate_urgency, get_task_name_for_planned

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    vehicles: List[Vehicle] = db.query(Vehicle).all()
    current_year = date.today().year
    today = date.today()

    total_overdue = 0
    vehicle_summaries = []

    for vehicle in vehicles:
        # Cost YTD
        records_ytd: List[ServiceRecord] = (
            db.query(ServiceRecord)
            .filter(
                ServiceRecord.vehicle_id == vehicle.id,
                ServiceRecord.date >= date(current_year, 1, 1),
            )
            .all()
        )
        cost_ytd = sum(r.total_cost for r in records_ytd)

        # Pending planned services
        pending_services: List[PlannedService] = (
            db.query(PlannedService)
            .filter(
                PlannedService.vehicle_id == vehicle.id,
                PlannedService.status == "pending",
            )
            .all()
        )

        overdue_count = 0
        upcoming_count = 0
        next_service: Optional[UpcomingService] = None
        best_urgency_days = None
        best_urgency_km = None

        for ps in pending_services:
            urg = calculate_urgency(ps, vehicle)
            task_name = get_task_name_for_planned(ps, db)

            if urg["is_overdue"]:
                overdue_count += 1
            else:
                upcoming_count += 1

            # Determine next service (most urgent)
            is_more_urgent = False
            if next_service is None:
                is_more_urgent = True
            elif urg["is_overdue"] and not next_service.is_overdue:
                is_more_urgent = True
            elif urg["is_overdue"] == next_service.is_overdue:
                cur_days = urg["urgency_days"] if urg["urgency_days"] is not None else -999999
                prev_days = best_urgency_days if best_urgency_days is not None else -999999
                if cur_days > prev_days:
                    is_more_urgent = True
                elif cur_days == prev_days:
                    cur_km = urg["urgency_km"] if urg["urgency_km"] is not None else -999999
                    prev_km = best_urgency_km if best_urgency_km is not None else -999999
                    if cur_km > prev_km:
                        is_more_urgent = True

            if is_more_urgent:
                best_urgency_days = urg["urgency_days"]
                best_urgency_km = urg["urgency_km"]
                next_service = UpcomingService(
                    planned_service_id=ps.id,
                    vehicle_id=vehicle.id,
                    vehicle_name=vehicle.name,
                    task_name=task_name,
                    due_date=ps.due_date,
                    due_km=ps.due_km,
                    urgency_days=urg["urgency_days"],
                    urgency_km=urg["urgency_km"],
                    is_overdue=urg["is_overdue"],
                    vehicle_photo_path=vehicle.photo_path,
                )

        total_overdue += overdue_count

        vehicle_summaries.append(
            VehicleSummary(
                vehicle=VehicleResponse.model_validate(vehicle),
                next_service=next_service,
                overdue_count=overdue_count,
                upcoming_count=upcoming_count,
                cost_ytd=cost_ytd,
            )
        )

    return DashboardSummary(
        vehicles=vehicle_summaries,
        total_overdue=total_overdue,
    )
