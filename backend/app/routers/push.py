from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.push_subscription import PushSubscription

router = APIRouter(prefix="/push", tags=["push"])


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscribeRequest(BaseModel):
    endpoint: str
    keys: PushKeys


class PushSubscribeResponse(BaseModel):
    id: int
    endpoint: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/subscribe", response_model=PushSubscribeResponse, status_code=status.HTTP_201_CREATED)
def subscribe(payload: PushSubscribeRequest, db: Session = Depends(get_db)):
    # Check if subscription already exists
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == payload.endpoint
    ).first()

    if existing:
        # Update keys if already registered
        existing.keys_p256dh = payload.keys.p256dh
        existing.keys_auth = payload.keys.auth
        db.commit()
        db.refresh(existing)
        return existing

    sub = PushSubscription(
        endpoint=payload.endpoint,
        keys_p256dh=payload.keys.p256dh,
        keys_auth=payload.keys.auth,
        created_at=datetime.utcnow(),
    )
    db.add(sub)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Subscription endpoint already exists")

    db.refresh(sub)
    return sub
