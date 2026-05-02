import enum
import uuid
from decimal import Decimal
from datetime import date

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, Numeric, String, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class IncomeType(str, enum.Enum):
    salary = "salary"
    trading = "trading"
    freelance = "freelance"
    passive = "passive"
    other = "other"


class IncomeFrequency(str, enum.Enum):
    one_time = "one_time"
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


class Income(Base, TimestampMixin):
    __tablename__ = "incomes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    income_type: Mapped[IncomeType] = mapped_column(
        Enum(IncomeType, name="incometype"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    frequency: Mapped[IncomeFrequency] = mapped_column(
        Enum(IncomeFrequency, name="incomefrequency"), nullable=False
    )
    payment_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transaction_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="VND")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

