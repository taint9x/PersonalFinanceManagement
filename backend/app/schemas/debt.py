import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.debt import DebtType, DebtStatus


class DebtBase(BaseModel):
    name: str = Field(..., max_length=255)
    debt_type: DebtType
    principal_amount: Decimal = Field(..., ge=0)
    remaining_amount: Decimal = Field(..., ge=0)
    interest_rate: Decimal = Field(default=Decimal("0"), ge=0)
    monthly_payment: Decimal = Field(default=Decimal("0"), ge=0)
    due_day: Optional[int] = Field(None, ge=1, le=31)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: DebtStatus = DebtStatus.active
    currency: str = "VND"
    notes: Optional[str] = None


class DebtCreate(DebtBase):
    pass


class DebtUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    debt_type: Optional[DebtType] = None
    principal_amount: Optional[Decimal] = Field(None, ge=0)
    remaining_amount: Optional[Decimal] = Field(None, ge=0)
    interest_rate: Optional[Decimal] = Field(None, ge=0)
    monthly_payment: Optional[Decimal] = Field(None, ge=0)
    due_day: Optional[int] = Field(None, ge=1, le=31)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[DebtStatus] = None
    currency: Optional[str] = None
    notes: Optional[str] = None


class DebtRead(DebtBase):
    id: uuid.UUID

    model_config = {"from_attributes": True}
