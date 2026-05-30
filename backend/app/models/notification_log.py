import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class NotificationChannel(str, enum.Enum):
    email = "email"
    telegram = "telegram"


class NotificationStatus(str, enum.Enum):
    success = "success"
    failed = "failed"
    retrying = "retrying"


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    period_key: Mapped[str] = mapped_column(String(7), nullable=False)
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notificationchannel", create_type=False),
        nullable=False,
    )
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="notificationstatus", create_type=False),
        nullable=False,
    )
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
