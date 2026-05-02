import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, Numeric, String, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from decimal import Decimal
from datetime import date

from app.models.base import Base, TimestampMixin


class DebtType(str, enum.Enum):
    credit_loan = "credit_loan"
    credit_card = "credit_card"
    personal_loan = "personal_loan"
    other = "other"


class DebtStatus(str, enum.Enum):
    active = "active"
    paid_off = "paid_off"
    paused = "paused"


class Debt(Base, TimestampMixin):
    __tablename__ = "debts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    debt_type: Mapped[DebtType] = mapped_column(Enum(DebtType, name="debttype"), nullable=False)
    principal_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    remaining_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    interest_rate: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False, default=0)
    monthly_payment: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    due_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[DebtStatus] = mapped_column(
        Enum(DebtStatus, name="debtstatus"), nullable=False, default=DebtStatus.active
    )
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="VND")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
