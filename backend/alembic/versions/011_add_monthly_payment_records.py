"""add monthly_payment_records table

Revision ID: 011
Revises: 93b2653e2316
Create Date: 2026-05-04

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "011"
down_revision: Union[str, None] = "93b2653e2316"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE monthlypaymentsourcetype AS ENUM ('debt', 'expense')")
    op.execute("CREATE TYPE monthlypaymentstatus AS ENUM ('paid', 'unpaid')")

    op.create_table(
        "monthly_payment_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "source_type",
            sa.String(20),
            nullable=False,
        ),
        sa.Column("source_id", UUID(as_uuid=True), nullable=False),
        sa.Column("period_key", sa.String(7), nullable=False),
        sa.Column("status", sa.String(10), nullable=False, server_default="paid"),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("marked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # Cast VARCHAR to enum types
    op.execute(
        "ALTER TABLE monthly_payment_records "
        "ALTER COLUMN source_type TYPE monthlypaymentsourcetype USING source_type::monthlypaymentsourcetype"
    )
    # Drop VARCHAR default, alter to enum type, then set enum-compatible default
    op.execute(
        "ALTER TABLE monthly_payment_records ALTER COLUMN status DROP DEFAULT"
    )
    op.execute(
        "ALTER TABLE monthly_payment_records "
        "ALTER COLUMN status TYPE monthlypaymentstatus USING status::monthlypaymentstatus"
    )
    op.execute(
        "ALTER TABLE monthly_payment_records ALTER COLUMN status SET DEFAULT 'paid'::monthlypaymentstatus"
    )

    # Unique constraint: one record per item per month per user
    op.create_unique_constraint(
        "uq_monthly_payment_records_user_source_period",
        "monthly_payment_records",
        ["user_id", "source_type", "source_id", "period_key"],
    )

    # Indexes for common query patterns
    op.create_index("ix_monthly_payment_records_user_id", "monthly_payment_records", ["user_id"])
    op.create_index("ix_monthly_payment_records_period_key", "monthly_payment_records", ["period_key"])
    op.create_index(
        "ix_monthly_payment_records_source",
        "monthly_payment_records",
        ["source_type", "source_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_monthly_payment_records_source", table_name="monthly_payment_records")
    op.drop_index("ix_monthly_payment_records_period_key", table_name="monthly_payment_records")
    op.drop_index("ix_monthly_payment_records_user_id", table_name="monthly_payment_records")
    op.drop_constraint(
        "uq_monthly_payment_records_user_source_period",
        "monthly_payment_records",
        type_="unique",
    )
    op.drop_table("monthly_payment_records")
    op.execute("DROP TYPE IF EXISTS monthlypaymentstatus")
    op.execute("DROP TYPE IF EXISTS monthlypaymentsourcetype")
