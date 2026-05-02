"""create monthly snapshots table

Revision ID: 007
Revises: 006
Create Date: 2026-05-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "monthly_snapshots",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("period_key", sa.String(7), nullable=False),
        sa.Column("total_income", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_expense", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_debt_payment", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("net_cashflow", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("snapshot_data", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("period_key", name="uq_monthly_snapshot_period"),
    )
    op.create_index("ix_monthly_snapshots_period_key", "monthly_snapshots", ["period_key"])


def downgrade() -> None:
    op.drop_index("ix_monthly_snapshots_period_key", "monthly_snapshots")
    op.drop_table("monthly_snapshots")
