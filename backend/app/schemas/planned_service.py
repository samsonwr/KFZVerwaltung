from typing import Optional
from datetime import date
from pydantic import BaseModel, ConfigDict


class PlannedServiceBase(BaseModel):
    vehicle_id: int
    maintenance_plan_id: Optional[int] = None
    due_date: Optional[date] = None
    due_km: Optional[int] = None
    status: str = "pending"


class PlannedServiceCreate(PlannedServiceBase):
    pass


class PlannedServiceUpdate(BaseModel):
    due_date: Optional[date] = None
    due_km: Optional[int] = None
    status: Optional[str] = None


class PlannedServiceStatusUpdate(BaseModel):
    status: str


class PlannedServiceResponse(PlannedServiceBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
