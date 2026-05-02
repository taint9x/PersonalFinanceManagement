from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class UpcomingDebt(BaseModel):
    id: str
    name: str
    monthly_payment: Decimal
    due_day: Optional[int] = None

class UpcomingIncome(BaseModel):
    id: str
    name: str
    amount: Decimal
    payment_day: Optional[int] = None

class MonthlySummary(BaseModel):
    period_key: str
    total_income: Decimal
    total_expense: Decimal
    total_debt_payment: Decimal
    net_cashflow: Decimal
    breakdown_by_type: Dict[str, Decimal] = {}
    active_subscriptions_count: int = 0
    active_subscriptions_total: Decimal = Decimal("0")
    upcoming_debts: List[UpcomingDebt] = []
    upcoming_incomes: List[UpcomingIncome] = []
    breakdown: Dict[str, Any] = {}


class MonthlyTrendPoint(BaseModel):
    period_key: str
    total_income: Decimal
    total_expense: Decimal
    total_debt_payment: Decimal
    net_cashflow: Decimal


class MonthlyTrendResponse(BaseModel):
    months: int
    data: List[MonthlyTrendPoint]
