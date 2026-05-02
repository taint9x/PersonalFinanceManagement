import enum
import uuid
from decimal import Decimal
from datetime import date

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, Numeric, String, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ExpenseType(str, enum.Enum):
    subscription = "subscription"
    utility = "utility"
    food = "food"
    transport = "transport"
    healthcare = "healthcare"
    entertainment = "entertainment"
    other = "other"


class Frequency(str, enum.Enum):
    one_time = "one_time"
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    expense_type: Mapped[ExpenseType] = mapped_column(
        Enum(ExpenseType, name="expensetype"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    frequency: Mapped[Frequency] = mapped_column(
        Enum(Frequency, name="expensefrequency"), nullable=False
    )
    billing_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transaction_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True
    )
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="VND")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
