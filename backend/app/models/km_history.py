from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.vehicle import Vehicle


class KmHistory(Base):
    __tablename__ = "km_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vehicle_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    km: Mapped[int] = mapped_column(Integer, nullable=False)
    reported_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    note: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="km_history")
