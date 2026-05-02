import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.income import IncomeType, IncomeFrequency


class IncomeBase(BaseModel):
    name: str = Field(..., max_length=255)
    income_type: IncomeType
    amount: Decimal = Field(..., ge=0)
    frequency: IncomeFrequency
    payment_day: Optional[int] = Field(None, ge=1, le=31)
    transaction_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: bool = True
    currency: str = "VND"
    notes: Optional[str] = None


class IncomeCreate(IncomeBase):
    pass


class IncomeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    income_type: Optional[IncomeType] = None
    amount: Optional[Decimal] = Field(None, ge=0)
    frequency: Optional[IncomeFrequency] = None
    payment_day: Optional[int] = Field(None, ge=1, le=31)
    transaction_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None
    currency: Optional[str] = None
    notes: Optional[str] = None


class IncomeRead(IncomeBase):
    id: uuid.UUID

    model_config = {"from_attributes": True}
