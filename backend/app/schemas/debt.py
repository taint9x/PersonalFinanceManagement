import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator

from app.models.debt import DebtType, DebtStatus, DebtCategory


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

    # Personal loan fields
    debt_category: DebtCategory = DebtCategory.monthly_installment
    repay_amount: Optional[Decimal] = Field(None, ge=0)
    borrow_date: Optional[date] = None
    repay_date: Optional[date] = None
    lender_name: Optional[str] = Field(None, max_length=255)


class DebtCreate(DebtBase):
    @model_validator(mode="after")
    def validate_category_fields(self) -> "DebtCreate":
        if self.debt_category == DebtCategory.personal_lump_sum:
            if self.repay_amount is None:
                raise ValueError("repay_amount is required for personal_lump_sum debts")
            if self.borrow_date is None:
                raise ValueError("borrow_date is required for personal_lump_sum debts")
            if not self.lender_name:
                raise ValueError("lender_name is required for personal_lump_sum debts")
            if self.repay_date is not None and self.repay_date < self.borrow_date:
                raise ValueError("repay_date must be >= borrow_date")
        else:
            # monthly_installment: existing required fields enforced by defaults
            pass
        return self


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

    # Personal loan fields (debt_category cannot be changed after creation)
    repay_amount: Optional[Decimal] = Field(None, ge=0)
    borrow_date: Optional[date] = None
    repay_date: Optional[date] = None
    lender_name: Optional[str] = Field(None, max_length=255)


class DebtRead(DebtBase):
    id: uuid.UUID
    is_fully_paid: bool = False
    actual_repaid_date: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AddPersonalLoansPayload(BaseModel):
    """Batch add personal loans to monthly overview."""
    period_key: str = Field(..., description="YYYY-MM format")
    debt_ids: List[uuid.UUID] = Field(..., min_length=1)
