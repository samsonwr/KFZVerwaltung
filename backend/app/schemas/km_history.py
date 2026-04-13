from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class KmHistoryResponse(BaseModel):
    id: int
    vehicle_id: int
    km: int
    reported_at: datetime
    note: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
