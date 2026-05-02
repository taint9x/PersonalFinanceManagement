"""create expenses table

Revision ID: 004
Revises: 003
Create Date: 2026-05-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

expensetype = ENUM("subscription", "utility", "food", "transport", "healthcare", "entertainment", "other", name="expensetype", create_type=False)
expensefrequency = ENUM("one_time", "weekly", "monthly", "yearly", name="expensefrequency", create_type=False)


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE expensetype AS ENUM ('subscription', 'utility', 'food', 'transport', 'healthcare', 'entertainment', 'other');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE expensefrequency AS ENUM ('one_time', 'weekly', 'monthly', 'yearly');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.create_table(
        "expenses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("expense_type", expensetype, nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("frequency", expensefrequency, nullable=False),
        sa.Column("billing_day", sa.Integer, nullable=True),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("category_id", UUID(as_uuid=True), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("currency", sa.String(10), nullable=False, server_default="VND"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("expenses")
    op.execute("DROP TYPE IF EXISTS expensefrequency")
    op.execute("DROP TYPE IF EXISTS expensetype")
