from typing import Optional, TYPE_CHECKING
from datetime import date
from sqlalchemy import Integer, String, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.vehicle import Vehicle
    from app.models.maintenance_plan import MaintenancePlan


class PlannedService(Base):
    __tablename__ = "planned_services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vehicle_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    maintenance_plan_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("maintenance_plans.id", ondelete="SET NULL"), nullable=True
    )
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    due_km: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")

    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="planned_services")
    maintenance_plan: Mapped[Optional["MaintenancePlan"]] = relationship(
        "MaintenancePlan", back_populates="planned_services"
    )
