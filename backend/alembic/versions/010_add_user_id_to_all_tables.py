"""add user_id to all tables

Revision ID: 010
Revises: 583b9bb28c43
Create Date: 2026-05-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "010"
down_revision: Union[str, None] = "583b9bb28c43"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Get the admin user ID to backfill existing rows
    conn = op.get_bind()
    admin = conn.execute(
        sa.text("SELECT id FROM users WHERE username = 'admin' LIMIT 1")
    ).fetchone()
    admin_id = admin[0] if admin else None

    tables = [
        "categories",
        "debts",
        "expenses",
        "incomes",
        "transactions",
        "ai_analyses",
        "monthly_snapshots",
    ]

    for table in tables:
        # 1. Add user_id as nullable first
        op.add_column(
            table,
            sa.Column("user_id", UUID(as_uuid=True), nullable=True),
        )

        # 2. Backfill existing rows with admin user id (if exists)
        if admin_id:
            conn.execute(
                sa.text(f"UPDATE {table} SET user_id = :uid WHERE user_id IS NULL"),
                {"uid": str(admin_id)},
            )

        # 3. Alter to NOT NULL
        op.alter_column(table, "user_id", nullable=False)

        # 4. Add FK constraint
        op.create_foreign_key(
            f"fk_{table}_user_id",
            table,
            "users",
            ["user_id"],
            ["id"],
        )

        # 5. Add index
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])

    # ── monthly_snapshots: update unique constraint ────────────────────────────
    op.drop_constraint("uq_monthly_snapshot_period", "monthly_snapshots", type_="unique")
    op.create_unique_constraint(
        "uq_monthly_snapshot_period_user", "monthly_snapshots", ["period_key", "user_id"]
    )

    # ── ai_analyses: replace single-period unique index with per-user one ─────
    op.execute("DROP INDEX IF EXISTS uq_ai_analysis_period_active")
    op.execute(
        "CREATE UNIQUE INDEX uq_ai_analysis_period_user_active "
        "ON ai_analyses (period_key, user_id) WHERE deleted_at IS NULL"
    )


def downgrade() -> None:
    tables = [
        "categories",
        "debts",
        "expenses",
        "incomes",
        "transactions",
        "ai_analyses",
        "monthly_snapshots",
    ]

    # Restore ai_analyses unique index
    op.execute("DROP INDEX IF EXISTS uq_ai_analysis_period_user_active")
    op.execute(
        "CREATE UNIQUE INDEX uq_ai_analysis_period_active "
        "ON ai_analyses (period_key) WHERE deleted_at IS NULL"
    )

    # Restore monthly_snapshots unique constraint
    op.drop_constraint("uq_monthly_snapshot_period_user", "monthly_snapshots", type_="unique")
    op.create_unique_constraint(
        "uq_monthly_snapshot_period", "monthly_snapshots", ["period_key"]
    )

    for table in reversed(tables):
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        op.drop_constraint(f"fk_{table}_user_id", table, type_="foreignkey")
        op.drop_column(table, "user_id")
