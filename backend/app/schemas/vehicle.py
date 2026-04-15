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
    key_number: Optional[str] = None
    fuel_type: Optional[str] = None
    engine_oil_type: Optional[str] = None
    engine_oil_capacity: Optional[float] = None
    gearbox_oil_type: Optional[str] = None
    gearbox_oil_capacity: Optional[float] = None
    coolant_type: Optional[str] = None
    coolant_capacity: Optional[float] = None
    brake_fluid_type: Optional[str] = None
    tire_size_summer: Optional[str] = None
    tire_size_winter: Optional[str] = None
    next_inspection_date: Optional[str] = None


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
    key_number: Optional[str] = None
    fuel_type: Optional[str] = None
    engine_oil_type: Optional[str] = None
    engine_oil_capacity: Optional[float] = None
    gearbox_oil_type: Optional[str] = None
    gearbox_oil_capacity: Optional[float] = None
    coolant_type: Optional[str] = None
    coolant_capacity: Optional[float] = None
    brake_fluid_type: Optional[str] = None
    tire_size_summer: Optional[str] = None
    tire_size_winter: Optional[str] = None
    next_inspection_date: Optional[str] = None


class VehicleResponse(VehicleBase):
    id: int
    photo_path: Optional[str] = None
    registration_doc_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class VehicleKmUpdate(BaseModel):
    km: int
    note: str | None = None
