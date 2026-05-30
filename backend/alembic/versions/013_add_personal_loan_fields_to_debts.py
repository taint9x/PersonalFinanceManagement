"""add personal loan fields to debts

Revision ID: 013
Revises: 012
Create Date: 2026-05-06

Adds 7 new columns to the debts table to support personal lump-sum loans
(vay cá nhân) — informal loans from friends/family repaid all at once.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create the ENUM type ───────────────────────────────────────────────
    op.execute(
        "CREATE TYPE debt_category_enum AS ENUM ('monthly_installment', 'personal_lump_sum')"
    )

    # ── 2. Add new columns ────────────────────────────────────────────────────
    # debt_category: use VARCHAR first, then cast to enum (avoids server_default type issue)
    op.add_column(
        "debts",
        sa.Column(
            "debt_category",
            sa.String(50),
            nullable=True,
        ),
    )

    # Backfill existing rows before making NOT NULL
    op.execute("UPDATE debts SET debt_category = 'monthly_installment' WHERE debt_category IS NULL")

    # Cast to enum and make NOT NULL
    op.execute(
        "ALTER TABLE debts "
        "ALTER COLUMN debt_category TYPE debt_category_enum "
        "USING debt_category::debt_category_enum"
    )
    op.execute("ALTER TABLE debts ALTER COLUMN debt_category SET NOT NULL")
    op.execute("ALTER TABLE debts ALTER COLUMN debt_category SET DEFAULT 'monthly_installment'")

    # repay_amount: agreed repayment amount (may differ from principal)
    op.add_column(
        "debts",
        sa.Column("repay_amount", sa.Numeric(15, 2), nullable=True),
    )

    # borrow_date: date money was borrowed
    op.add_column(
        "debts",
        sa.Column("borrow_date", sa.Date(), nullable=True),
    )

    # repay_date: planned/agreed repayment date
    op.add_column(
        "debts",
        sa.Column("repay_date", sa.Date(), nullable=True),
    )

    # lender_name: name of person/entity who lent the money
    op.add_column(
        "debts",
        sa.Column("lender_name", sa.String(255), nullable=True),
    )

    # is_fully_paid: true when the entire loan has been repaid
    op.add_column(
        "debts",
        sa.Column(
            "is_fully_paid",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # actual_repaid_date: when the loan was actually fully repaid
    op.add_column(
        "debts",
        sa.Column("actual_repaid_date", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    # Remove columns in reverse order
    op.drop_column("debts", "actual_repaid_date")
    op.drop_column("debts", "is_fully_paid")
    op.drop_column("debts", "lender_name")
    op.drop_column("debts", "repay_date")
    op.drop_column("debts", "borrow_date")
    op.drop_column("debts", "repay_amount")
    op.drop_column("debts", "debt_category")

    # Drop the ENUM type
    op.execute("DROP TYPE IF EXISTS debt_category_enum")
