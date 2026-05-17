import uuid
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.models.monthly_payment_record import MonthlyPaymentSourceType, MonthlyPaymentStatus


class OverviewSummary(BaseModel):
    total_income: str
    total_expense: str
    total_debt_payment: str
    net_cashflow: str
    paid_count: int
    unpaid_count: int


class OverviewItem(BaseModel):
    id: str
    source_type: str  # "debt" | "expense" | "income"
    name: str
    amount: str
    frequency: str
    category: str

    # Debt-specific
    due_day: Optional[int] = None
    remaining_amount: Optional[str] = None

    # Debt + Expense only
    is_paid: Optional[bool] = None
    payment_record_id: Optional[str] = None
    marked_at: Optional[str] = None

    # Personal loan fields (present when source_type = 'debt' and debt_category = 'personal_lump_sum')
    debt_category: Optional[str] = None   # "monthly_installment" | "personal_lump_sum"
    is_fully_paid: Optional[bool] = None
    lender_name: Optional[str] = None


class MonthlyOverviewResponse(BaseModel):
    period: str
    summary: OverviewSummary
    items: list[OverviewItem]


class MarkPaymentPayload(BaseModel):
    source_type: MonthlyPaymentSourceType
    source_id: uuid.UUID
    period_key: str
    note: Optional[str] = None


class PaymentRecordRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    source_type: MonthlyPaymentSourceType
    source_id: uuid.UUID
    period_key: str
    status: MonthlyPaymentStatus
    note: Optional[str] = None
    marked_at: Optional[str] = None
    updated_at: str

    model_config = {"from_attributes": True}


class PersonalLoanAvailableRead(BaseModel):
    """A personal_lump_sum debt available to be added to the monthly overview."""
    id: str
    name: str
    lender_name: str
    principal_amount: str   # borrowed amount (Decimal string)
    repay_amount: str        # to repay (Decimal string)
    borrow_date: str         # ISO date
    repay_date: Optional[str] = None
    already_in_overview: bool  # True if already has a monthly_payment_record for this period
