from typing import Optional
from datetime import date
from pydantic import BaseModel, ConfigDict


class MaintenancePlanBase(BaseModel):
    task_name: str
    interval_km: Optional[int] = None
    interval_days: Optional[int] = None
    last_done_km: Optional[int] = None
    last_done_date: Optional[date] = None
    notes: Optional[str] = None


class MaintenancePlanCreate(MaintenancePlanBase):
    pass


class MaintenancePlanUpdate(BaseModel):
    task_name: Optional[str] = None
    interval_km: Optional[int] = None
    interval_days: Optional[int] = None
    last_done_km: Optional[int] = None
    last_done_date: Optional[date] = None
    notes: Optional[str] = None


class MaintenancePlanResponse(MaintenancePlanBase):
    id: int
    vehicle_id: int

    model_config = ConfigDict(from_attributes=True)
