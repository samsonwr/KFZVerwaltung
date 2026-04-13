from typing import Optional
from pydantic import BaseModel, ConfigDict


class VehicleBase(BaseModel):
    name: str
    make: str
    model: str
    year: int
    vin: Optional[str] = None
    license_plate: Optional[str] = None
    current_km: int = 0


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    name: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    vin: Optional[str] = None
    license_plate: Optional[str] = None
    current_km: Optional[int] = None


class VehicleResponse(VehicleBase):
    id: int
    photo_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class VehicleKmUpdate(BaseModel):
    km: int
    note: str | None = None
