import uuid
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.debt import Debt, DebtStatus, DebtCategory
from app.models.expense import Expense, Frequency as ExpFreq
from app.models.income import Income, IncomeFrequency

from app.models.transaction import Transaction, SourceType
from app.schemas.dashboard import MonthlySummary, MonthlyTrendPoint


def _parse_period(period_key: str):
    """Return (year, month) ints from 'YYYY-MM' string."""
    year, month = period_key.split("-")
    return int(year), int(month)


def _period_range(year: int, month: int):
    """Return (first_day, last_day) date objects for the given month."""
    import calendar
    first = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    last = date(year, month, last_day)
    return first, last


async def compute_monthly_summary(
    db: AsyncSession, period_key: str, user_id: uuid.UUID
) -> MonthlySummary:
    """
    Compute the monthly financial summary for a given YYYY-MM period and user.
    Business rules from backend.md:
    1. Include monthly-frequency records that are active and within start/end dates
    2. Include one_time transactions within the period's date range
    3. For debts: count monthly_payment of all active debts
    """
    import calendar

    year, month = _parse_period(period_key)
    last_day = calendar.monthrange(year, month)[1]
    period_start = date(year, month, 1)
    period_end = date(year, month, last_day)

    # ── Incomes ───────────────────────────────────────────────────────────────
    income_result = await db.execute(
        select(Income).where(
            and_(
                Income.user_id == user_id,
                Income.deleted_at.is_(None),
                Income.is_active.is_(True),
                (
                    (
                        (Income.frequency == IncomeFrequency.monthly)
                        & ((Income.start_date.is_(None)) | (Income.start_date <= period_end))
                        & ((Income.end_date.is_(None)) | (Income.end_date >= period_start))
                    )
                    | (
                        (Income.frequency == IncomeFrequency.one_time)
                        & (Income.transaction_date >= period_start)
                        & (Income.transaction_date <= period_end)
                    )
                )
            )
        )
    )
    incomes = income_result.scalars().all()
    total_income = sum((i.amount for i in incomes), Decimal("0"))

    income_breakdown: Dict[str, Decimal] = {}
    for inc in incomes:
        key = inc.income_type.value
        income_breakdown[key] = income_breakdown.get(key, Decimal("0")) + inc.amount

    # ── Expenses ──────────────────────────────────────────────────────────────
    expense_result = await db.execute(
        select(Expense).where(
            and_(
                Expense.user_id == user_id,
                Expense.deleted_at.is_(None),
                Expense.is_active.is_(True),
                (
                    (
                        (Expense.frequency == ExpFreq.monthly)
                        & ((Expense.start_date.is_(None)) | (Expense.start_date <= period_end))
                        & ((Expense.end_date.is_(None)) | (Expense.end_date >= period_start))
                    )
                    | (
                        (Expense.frequency == ExpFreq.one_time)
                        & (Expense.transaction_date >= period_start)
                        & (Expense.transaction_date <= period_end)
                    )
                )
            )
        )
    )
    expenses = expense_result.scalars().all()
    total_expense = sum((e.amount for e in expenses), Decimal("0"))

    expense_breakdown: Dict[str, Decimal] = {}
    for exp in expenses:
        key = exp.expense_type.value
        expense_breakdown[key] = expense_breakdown.get(key, Decimal("0")) + exp.amount

    # Top 3 largest expenses
    top_expenses = sorted(expenses, key=lambda e: e.amount, reverse=True)[:3]

    # ── One-time transactions ─────────────────────────────────────────────────
    tx_result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.deleted_at.is_(None),
                Transaction.transaction_date >= period_start,
                Transaction.transaction_date <= period_end,
            )
        )
    )
    transactions = tx_result.scalars().all()

    for tx in transactions:
        if tx.source_type == SourceType.income:
            total_income += tx.amount
        elif tx.source_type == SourceType.expense:
            total_expense += tx.amount

    # ── Debts (monthly_installment only — personal_lump_sum excluded from total_debt_payment) ───
    debt_result = await db.execute(
        select(Debt).where(
            and_(
                Debt.user_id == user_id,
                Debt.deleted_at.is_(None),
                Debt.status == DebtStatus.active,
                Debt.debt_category == DebtCategory.monthly_installment,
            )
        )
    )
    debts = debt_result.scalars().all()
    total_debt_payment = sum((d.monthly_payment for d in debts), Decimal("0"))

    net_cashflow = total_income - total_expense - total_debt_payment

    breakdown: Dict[str, Any] = {
        "income_by_type": {k: str(v) for k, v in income_breakdown.items()},
        "expense_by_type": {k: str(v) for k, v in expense_breakdown.items()},
        "top_expenses": [
            {"name": e.name, "amount": str(e.amount), "type": e.expense_type.value}
            for e in top_expenses
        ],
        "debts": [
            {"name": d.name, "monthly_payment": str(d.monthly_payment), "status": d.status.value}
            for d in debts
        ],
    }

    # Calculate active subscriptions (expenses with expense_type == subscription and frequency != one_time)
    subscriptions = [e for e in expenses if e.expense_type.value == "subscription"]
    active_subscriptions_count = len(subscriptions)
    active_subscriptions_total = sum((e.amount for e in subscriptions), Decimal("0"))
    
    upcoming_debts = [
        {"id": str(d.id), "name": d.name, "monthly_payment": str(d.monthly_payment), "due_day": d.due_day}
        for d in debts if d.due_day is not None
    ]
    upcoming_debts.sort(key=lambda x: x["due_day"])
    
    upcoming_incomes = [
        {"id": str(i.id), "name": i.name, "amount": str(i.amount), "payment_day": i.payment_day}
        for i in incomes if i.payment_day is not None
    ]
    upcoming_incomes.sort(key=lambda x: x["payment_day"])

    return MonthlySummary(
        period_key=period_key,
        total_income=total_income,
        total_expense=total_expense,
        total_debt_payment=total_debt_payment,
        net_cashflow=net_cashflow,
        breakdown_by_type=expense_breakdown,
        active_subscriptions_count=active_subscriptions_count,
        active_subscriptions_total=active_subscriptions_total,
        upcoming_debts=upcoming_debts,
        upcoming_incomes=upcoming_incomes,
        breakdown=breakdown,
    )


async def get_monthly_trend(
    db: AsyncSession, months: int = 6, user_id: uuid.UUID = None
) -> List[MonthlyTrendPoint]:
    """Return last N months of cashflow trend data for a specific user."""
    from dateutil.relativedelta import relativedelta

    today = date.today()
    points: List[MonthlyTrendPoint] = []

    for i in range(months - 1, -1, -1):
        target = today - relativedelta(months=i)
        period_key = target.strftime("%Y-%m")
        summary = await compute_monthly_summary(db, period_key, user_id)
        points.append(
            MonthlyTrendPoint(
                period_key=period_key,
                total_income=summary.total_income,
                total_expense=summary.total_expense,
                total_debt_payment=summary.total_debt_payment,
                net_cashflow=summary.net_cashflow,
            )
        )

    return points
