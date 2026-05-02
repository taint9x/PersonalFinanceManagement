"""create ai analyses table

Revision ID: 008
Revises: 007
Create Date: 2026-05-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_analyses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("period_key", sa.String(7), nullable=False),
        sa.Column("prompt_used", sa.Text, nullable=False),
        sa.Column("analysis_text", sa.Text, nullable=False),
        sa.Column("model_used", sa.String(100), nullable=False),
        sa.Column("token_usage", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_ai_analyses_period_key", "ai_analyses", ["period_key"])
    # Partial unique index: only enforce uniqueness for non-deleted rows
    op.execute(
        "CREATE UNIQUE INDEX uq_ai_analysis_period_active ON ai_analyses (period_key) WHERE deleted_at IS NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_ai_analysis_period_active")
    op.drop_index("ix_ai_analyses_period_key", "ai_analyses")
    op.drop_table("ai_analyses")
