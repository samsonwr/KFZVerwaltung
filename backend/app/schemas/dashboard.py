from typing import Optional, List
from datetime import date
from pydantic import BaseModel
from app.schemas.vehicle import VehicleResponse


class UpcomingService(BaseModel):
    planned_service_id: int
    vehicle_id: int
    vehicle_name: str
    task_name: str
    due_date: Optional[date] = None
    due_km: Optional[int] = None
    urgency_days: Optional[int] = None   # positiv = ueberfaellig
    urgency_km: Optional[int] = None     # positiv = ueberfaellig
    is_overdue: bool
    vehicle_photo_path: Optional[str] = None


class VehicleSummary(BaseModel):
    vehicle: VehicleResponse
    next_service: Optional[UpcomingService] = None
    overdue_count: int
    upcoming_count: int
    cost_ytd: float


class DashboardSummary(BaseModel):
    vehicles: List[VehicleSummary]
    total_overdue: int
