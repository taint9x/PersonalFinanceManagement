"""add notification_logs table

Revision ID: 012
Revises: 011
Create Date: 2026-05-04

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE notificationchannel AS ENUM ('email', 'telegram')")
    op.execute("CREATE TYPE notificationstatus AS ENUM ('success', 'failed', 'retrying')")

    op.create_table(
        "notification_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("period_key", sa.String(7), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("attempt_count", sa.Integer, nullable=False, server_default="1"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # Cast VARCHAR to enum types
    op.execute(
        "ALTER TABLE notification_logs "
        "ALTER COLUMN channel TYPE notificationchannel USING channel::notificationchannel"
    )
    op.execute(
        "ALTER TABLE notification_logs "
        "ALTER COLUMN status TYPE notificationstatus USING status::notificationstatus"
    )

    op.create_index("ix_notification_logs_user_id", "notification_logs", ["user_id"])
    op.create_index("ix_notification_logs_period_key", "notification_logs", ["period_key"])
    op.create_index("ix_notification_logs_created_at", "notification_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_notification_logs_created_at", table_name="notification_logs")
    op.drop_index("ix_notification_logs_period_key", table_name="notification_logs")
    op.drop_index("ix_notification_logs_user_id", table_name="notification_logs")
    op.drop_table("notification_logs")
    op.execute("DROP TYPE IF EXISTS notificationstatus")
    op.execute("DROP TYPE IF EXISTS notificationchannel")
