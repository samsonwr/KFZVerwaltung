from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.maintenance_plan import MaintenancePlan
    from app.models.service_record import ServiceRecord
    from app.models.planned_service import PlannedService
    from app.models.km_history import KmHistory


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    make: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    vin: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    license_plate: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    current_km: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    photo_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    maintenance_plans: Mapped[List["MaintenancePlan"]] = relationship(
        "MaintenancePlan",
        back_populates="vehicle",
        cascade="all, delete-orphan",
    )
    service_records: Mapped[List["ServiceRecord"]] = relationship(
        "ServiceRecord",
        back_populates="vehicle",
        cascade="all, delete-orphan",
    )
    planned_services: Mapped[List["PlannedService"]] = relationship(
        "PlannedService",
        back_populates="vehicle",
        cascade="all, delete-orphan",
    )
    km_history: Mapped[List["KmHistory"]] = relationship(
        "KmHistory",
        back_populates="vehicle",
        cascade="all, delete-orphan",
        order_by="KmHistory.reported_at.desc()",
    )
