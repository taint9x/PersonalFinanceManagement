"""create debts table

Revision ID: 003
Revises: 002
Create Date: 2026-05-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

debttype = ENUM("credit_loan", "credit_card", "personal_loan", "other", name="debttype", create_type=False)
debtstatus = ENUM("active", "paid_off", "paused", name="debtstatus", create_type=False)


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE debttype AS ENUM ('credit_loan', 'credit_card', 'personal_loan', 'other');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE debtstatus AS ENUM ('active', 'paid_off', 'paused');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.create_table(
        "debts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("debt_type", debttype, nullable=False),
        sa.Column("principal_amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("remaining_amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("interest_rate", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("monthly_payment", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("due_day", sa.Integer, nullable=True),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("status", debtstatus, nullable=False, server_default="active"),
        sa.Column("currency", sa.String(10), nullable=False, server_default="VND"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("debts")
    op.execute("DROP TYPE IF EXISTS debtstatus")
    op.execute("DROP TYPE IF EXISTS debttype")
