import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, Numeric, String, Text, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from decimal import Decimal
from datetime import date, datetime

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


class DebtCategory(str, enum.Enum):
    monthly_installment = "monthly_installment"
    personal_lump_sum = "personal_lump_sum"


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

    # ── Personal loan fields (personal_lump_sum category) ─────────────────────
    debt_category: Mapped[DebtCategory] = mapped_column(
        Enum(DebtCategory, name="debt_category_enum", create_type=False),
        nullable=False,
        default=DebtCategory.monthly_installment,
    )
    repay_amount: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    borrow_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    repay_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    lender_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_fully_paid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    actual_repaid_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
