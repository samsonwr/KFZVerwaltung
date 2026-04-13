from typing import Optional, List, TYPE_CHECKING
from datetime import date
from sqlalchemy import Integer, String, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.vehicle import Vehicle
    from app.models.planned_service import PlannedService


class MaintenancePlan(Base):
    __tablename__ = "maintenance_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vehicle_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    task_name: Mapped[str] = mapped_column(String, nullable=False)
    interval_km: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    interval_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    last_done_km: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    last_done_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="maintenance_plans")
    planned_services: Mapped[List["PlannedService"]] = relationship(
        "PlannedService",
        back_populates="maintenance_plan",
    )
