from datetime import date, timedelta
from typing import List
from sqlalchemy.orm import Session

from app.models.planned_service import PlannedService
from app.models.vehicle import Vehicle
from app.models.maintenance_plan import MaintenancePlan


def calculate_urgency(planned: PlannedService, vehicle: Vehicle) -> dict:
    today = date.today()
    urgency_km = None
    urgency_days = None

    if planned.due_km is not None:
        urgency_km = vehicle.current_km - planned.due_km  # positiv = ueberfaellig

    if planned.due_date is not None:
        urgency_days = (today - planned.due_date).days  # positiv = ueberfaellig

    is_overdue = (urgency_km is not None and urgency_km > 0) or \
                 (urgency_days is not None and urgency_days > 0)

    return {
        "urgency_km": urgency_km,
        "urgency_days": urgency_days,
        "is_overdue": is_overdue,
    }


def get_task_name_for_planned(planned: PlannedService, db: Session) -> str:
    """Returns the task name for a PlannedService, either from its MaintenancePlan or a default."""
    if planned.maintenance_plan_id is not None:
        plan = db.get(MaintenancePlan, planned.maintenance_plan_id)
        if plan:
            return plan.task_name
    return "Wartung"


def get_upcoming_services(db: Session, days: int = 60, km_threshold: int = 1000) -> list:
    """
    Holt alle pending PlannedServices.
    Filtert: due_date innerhalb days ODER due_km innerhalb km_threshold von current_km.
    Sortiert: ueberfaellige zuerst, dann nach Urgenz.
    """
    today = date.today()
    cutoff_date = today + timedelta(days=days)

    pending_services: List[PlannedService] = (
        db.query(PlannedService)
        .filter(PlannedService.status == "pending")
        .all()
    )

    result = []
    for planned in pending_services:
        vehicle = db.get(Vehicle, planned.vehicle_id)
        if vehicle is None:
            continue

        urgency = calculate_urgency(planned, vehicle)

        # Filter: include if date is within range OR km within threshold OR already overdue
        include = False
        if urgency["is_overdue"]:
            include = True
        elif planned.due_date is not None and planned.due_date <= cutoff_date:
            include = True
        elif planned.due_km is not None and (planned.due_km - vehicle.current_km) <= km_threshold:
            include = True

        if not include:
            continue

        task_name = get_task_name_for_planned(planned, db)

        result.append({
            "planned_service_id": planned.id,
            "vehicle_id": planned.vehicle_id,
            "vehicle_name": vehicle.name,
            "task_name": task_name,
            "due_date": planned.due_date,
            "due_km": planned.due_km,
            "urgency_days": urgency["urgency_days"],
            "urgency_km": urgency["urgency_km"],
            "is_overdue": urgency["is_overdue"],
            "vehicle_photo_path": vehicle.photo_path,
        })

    # Sort: overdue first, then by urgency_days desc, then urgency_km desc
    def sort_key(item):
        overdue = 0 if item["is_overdue"] else 1
        urg_days = -(item["urgency_days"] if item["urgency_days"] is not None else -999999)
        urg_km = -(item["urgency_km"] if item["urgency_km"] is not None else -999999)
        return (overdue, urg_days, urg_km)

    result.sort(key=sort_key)
    return result


def create_planned_services_from_record(
    db: Session,
    vehicle_id: int,
    tasks: List[str],
    km_at_service: int,
    service_date: date,
) -> None:
    """
    After saving a ServiceRecord, find matching MaintenancePlans and create new PlannedServices.
    Also updates last_done_km and last_done_date on the matched plans.
    """
    plans: List[MaintenancePlan] = (
        db.query(MaintenancePlan)
        .filter(MaintenancePlan.vehicle_id == vehicle_id)
        .all()
    )

    for plan in plans:
        if plan.task_name not in tasks:
            continue

        # Update the plan's last done info
        plan.last_done_km = km_at_service
        plan.last_done_date = service_date

        # Calculate next due values
        due_km = None
        due_date = None

        if plan.interval_km is not None:
            due_km = km_at_service + plan.interval_km

        if plan.interval_days is not None:
            due_date = service_date + timedelta(days=plan.interval_days)

        # Only create a new planned service if there's something to plan
        if due_km is not None or due_date is not None:
            # Mark existing pending planned services for this plan as done
            existing = (
                db.query(PlannedService)
                .filter(
                    PlannedService.vehicle_id == vehicle_id,
                    PlannedService.maintenance_plan_id == plan.id,
                    PlannedService.status == "pending",
                )
                .all()
            )
            for ps in existing:
                ps.status = "done"

            new_ps = PlannedService(
                vehicle_id=vehicle_id,
                maintenance_plan_id=plan.id,
                due_date=due_date,
                due_km=due_km,
                status="pending",
            )
            db.add(new_ps)

    db.flush()
