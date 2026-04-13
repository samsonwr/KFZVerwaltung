from typing import Optional, List, Any, TYPE_CHECKING
from datetime import date
from sqlalchemy import Integer, String, Date, Float, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.vehicle import Vehicle


class ServiceRecord(Base):
    __tablename__ = "service_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vehicle_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    km_at_service: Mapped[int] = mapped_column(Integer, nullable=False)
    tasks: Mapped[List[Any]] = mapped_column(JSON, nullable=False, default=list)
    parts_used: Mapped[List[Any]] = mapped_column(JSON, nullable=False, default=list)
    total_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    photos: Mapped[List[Any]] = mapped_column(JSON, nullable=False, default=list)

    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="service_records")
