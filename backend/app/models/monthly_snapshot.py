import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class MonthlySnapshot(Base, TimestampMixin):
    __tablename__ = "monthly_snapshots"
    __table_args__ = (UniqueConstraint("period_key", "user_id", name="uq_monthly_snapshot_period_user"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    period_key: Mapped[str] = mapped_column(String(7), nullable=False, index=True)  # YYYY-MM
    total_income: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    total_expense: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    total_debt_payment: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    net_cashflow: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    snapshot_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

