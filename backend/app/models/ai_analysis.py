import uuid

from sqlalchemy import String, Text, Index, UniqueConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class AiAnalysis(Base, TimestampMixin):
    __tablename__ = "ai_analyses"
    __table_args__ = (
        UniqueConstraint("period_key", "user_id", name="uq_ai_analysis_period_user"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    period_key: Mapped[str] = mapped_column(String(7), nullable=False, index=True)
    prompt_used: Mapped[str] = mapped_column(Text, nullable=False)
    analysis_text: Mapped[str] = mapped_column(Text, nullable=False)
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)
    token_usage: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

