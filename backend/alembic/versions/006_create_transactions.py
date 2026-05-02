"""create transactions table

Revision ID: 006
Revises: 005
Create Date: 2026-05-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

sourcetype = ENUM("debt", "expense", "income", name="sourcetype", create_type=False)


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE sourcetype AS ENUM ('debt', 'expense', 'income');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.create_table(
        "transactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("source_type", sourcetype, nullable=False),
        sa.Column("source_id", UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("transaction_date", sa.Date, nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="VND"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_transactions_transaction_date", "transactions", ["transaction_date"])


def downgrade() -> None:
    op.drop_index("ix_transactions_transaction_date", "transactions")
    op.drop_table("transactions")
    op.execute("DROP TYPE IF EXISTS sourcetype")
