import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.transaction import SourceType


class TransactionCreate(BaseModel):
    source_type: SourceType
    source_id: uuid.UUID
    amount: Decimal = Field(..., ge=0)
    transaction_date: date
    currency: str = "VND"
    notes: Optional[str] = None


class TransactionRead(TransactionCreate):
    id: uuid.UUID

    model_config = {"from_attributes": True}
