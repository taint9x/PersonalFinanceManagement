import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.expense import ExpenseType, Frequency


class ExpenseBase(BaseModel):
    name: str = Field(..., max_length=255)
    expense_type: ExpenseType
    amount: Decimal = Field(..., ge=0)
    frequency: Frequency
    billing_day: Optional[int] = Field(None, ge=1, le=31)
    transaction_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: bool = True
    category_id: Optional[uuid.UUID] = None
    currency: str = "VND"
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    expense_type: Optional[ExpenseType] = None
    amount: Optional[Decimal] = Field(None, ge=0)
    frequency: Optional[Frequency] = None
    billing_day: Optional[int] = Field(None, ge=1, le=31)
    transaction_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None
    category_id: Optional[uuid.UUID] = None
    currency: Optional[str] = None
    notes: Optional[str] = None


class ExpenseRead(ExpenseBase):
    id: uuid.UUID

    model_config = {"from_attributes": True}
