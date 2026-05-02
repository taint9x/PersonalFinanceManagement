"""seed admin user

Revision ID: 009
Revises: 008
Create Date: 2026-05-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Pre-computed bcrypt hash for "changeme" (cost 12), generated via:
# docker run --rm --entrypoint python backend-backend -c "import bcrypt; print(bcrypt.hashpw(b'changeme', bcrypt.gensalt(12)).decode())"
ADMIN_HASHED_PASSWORD = "$2b$12$yFlxQBNS/.8Ysk5TUoaqceXK3qYu5qtSzEpIIAbswQ5Q1h3b5PB1y"


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            INSERT INTO users (id, username, email, hashed_password, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'admin',
                'admin@finance.local',
                :hashed_password,
                NOW(),
                NOW()
            )
            ON CONFLICT (username) DO NOTHING
            """
        ).bindparams(hashed_password=ADMIN_HASHED_PASSWORD)
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM users WHERE username = 'admin'"))
