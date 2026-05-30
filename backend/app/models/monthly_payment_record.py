import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class MonthlyPaymentSourceType(str, enum.Enum):
    debt = "debt"
    expense = "expense"


class MonthlyPaymentStatus(str, enum.Enum):
    paid = "paid"
    unpaid = "unpaid"


class MonthlyPaymentRecord(Base):
    __tablename__ = "monthly_payment_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    source_type: Mapped[MonthlyPaymentSourceType] = mapped_column(
        Enum(MonthlyPaymentSourceType, name="monthlypaymentsourcetype", create_type=False),
        nullable=False,
    )
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    period_key: Mapped[str] = mapped_column(String(7), nullable=False)
    status: Mapped[MonthlyPaymentStatus] = mapped_column(
        Enum(MonthlyPaymentStatus, name="monthlypaymentstatus", create_type=False),
        nullable=False,
        default=MonthlyPaymentStatus.paid,
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    marked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
