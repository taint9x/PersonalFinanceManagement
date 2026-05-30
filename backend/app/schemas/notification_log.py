import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.notification_log import NotificationChannel, NotificationStatus


class NotificationLogRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    period_key: str
    channel: NotificationChannel
    status: NotificationStatus
    attempt_count: int
    error_message: Optional[str] = None
    sent_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
