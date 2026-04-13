from typing import Optional, List, Any
from datetime import date
from pydantic import BaseModel, ConfigDict


class PartUsed(BaseModel):
    name: str
    cost: float


class ServiceRecordBase(BaseModel):
    vehicle_id: int
    date: date
    km_at_service: int
    tasks: List[str] = []
    parts_used: List[Any] = []
    total_cost: float = 0.0
    notes: Optional[str] = None


class ServiceRecordCreate(ServiceRecordBase):
    pass


class ServiceRecordUpdate(BaseModel):
    date: Optional[date] = None
    km_at_service: Optional[int] = None
    tasks: Optional[List[str]] = None
    parts_used: Optional[List[Any]] = None
    total_cost: Optional[float] = None
    notes: Optional[str] = None


class ServiceRecordResponse(ServiceRecordBase):
    id: int
    photos: List[str] = []

    model_config = ConfigDict(from_attributes=True)
