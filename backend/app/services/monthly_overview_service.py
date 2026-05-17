"""
Monthly Overview Service
Builds a unified view of debts, expenses, and incomes for a given YYYY-MM period.
Applies the period filtering rules from backend-new-requirement.md.
"""
import uuid
from datetime import date, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.debt import Debt, DebtStatus, DebtCategory
from app.models.expense import Expense, Frequency as ExpFreq
from app.models.income import Income, IncomeFrequency
from app.models.monthly_payment_record import (
    MonthlyPaymentRecord,
    MonthlyPaymentSourceType,
    MonthlyPaymentStatus,
)
from app.schemas.monthly_overview import (
    MonthlyOverviewResponse,
    OverviewItem,
    OverviewSummary,
)


def _parse_period(period_key: str):
    """Return (year, month) from 'YYYY-MM'."""
    year, month = period_key.split("-")
    return int(year), int(month)


def _period_range(year: int, month: int):
    import calendar
    first = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    last = date(year, month, last_day)
    return first, last


async def get_monthly_overview(
    db: AsyncSession,
    period_key: str,
    user_id: uuid.UUID,
    type_filter: Optional[str] = "all",
) -> MonthlyOverviewResponse:
    year, month = _parse_period(period_key)
    period_start, period_end = _period_range(year, month)

    items: list[OverviewItem] = []

    # ── Debts (monthly_installment only, active status) ─────────────────────
    if type_filter in ("all", "debt"):
        debt_result = await db.execute(
            select(Debt).where(
                and_(
                    Debt.user_id == user_id,
                    Debt.deleted_at.is_(None),
                    Debt.status == DebtStatus.active,
                    Debt.debt_category == DebtCategory.monthly_installment,
                    (Debt.start_date.is_(None)) | (Debt.start_date <= period_end),
                    (Debt.end_date.is_(None)) | (Debt.end_date >= period_start),
                )
            )
        )
        debts = debt_result.scalars().all()

        # Batch-load payment records for all debts in this period
        debt_ids = [d.id for d in debts]
        debt_payment_map: dict[uuid.UUID, MonthlyPaymentRecord] = {}
        if debt_ids:
            pr_result = await db.execute(
                select(MonthlyPaymentRecord).where(
                    and_(
                        MonthlyPaymentRecord.user_id == user_id,
                        MonthlyPaymentRecord.source_type == MonthlyPaymentSourceType.debt,
                        MonthlyPaymentRecord.source_id.in_(debt_ids),
                        MonthlyPaymentRecord.period_key == period_key,
                    )
                )
            )
            for pr in pr_result.scalars().all():
                debt_payment_map[pr.source_id] = pr

        for debt in debts:
            pr = debt_payment_map.get(debt.id)
            is_paid = (pr is not None and pr.status == MonthlyPaymentStatus.paid)
            items.append(
                OverviewItem(
                    id=str(debt.id),
                    source_type="debt",
                    name=debt.name,
                    amount=str(debt.monthly_payment),
                    frequency="monthly",
                    category=debt.debt_type.value,
                    due_day=debt.due_day,
                    remaining_amount=str(debt.remaining_amount),
                    is_paid=is_paid,
                    payment_record_id=str(pr.id) if pr else None,
                    marked_at=(
                        pr.marked_at.astimezone(timezone.utc).isoformat()
                        if pr and pr.marked_at
                        else None
                    ),
                    debt_category=debt.debt_category.value,
                )
            )

        # ── Also include personal_lump_sum debts that have payment records for this period
        personal_pr_result = await db.execute(
            select(MonthlyPaymentRecord).where(
                and_(
                    MonthlyPaymentRecord.user_id == user_id,
                    MonthlyPaymentRecord.source_type == MonthlyPaymentSourceType.debt,
                    MonthlyPaymentRecord.period_key == period_key,
                )
            )
        )
        personal_prs = personal_pr_result.scalars().all()

        if personal_prs:
            # Collect IDs of personal_lump_sum debts referenced by payment records
            personal_debt_ids = [pr.source_id for pr in personal_prs]
            personal_debt_result = await db.execute(
                select(Debt).where(
                    and_(
                        Debt.id.in_(personal_debt_ids),
                        Debt.user_id == user_id,
                        Debt.deleted_at.is_(None),
                        Debt.debt_category == DebtCategory.personal_lump_sum,
                    )
                )
            )
            personal_debts = {d.id: d for d in personal_debt_result.scalars().all()}
            personal_pr_map = {pr.source_id: pr for pr in personal_prs}

            # Only include those not already in the main debt list
            existing_ids = {d.id for d in debts}
            for debt_id, debt in personal_debts.items():
                if debt_id in existing_ids:
                    continue
                pr = personal_pr_map.get(debt_id)
                if not pr:
                    continue
                is_paid = pr.status == MonthlyPaymentStatus.paid
                # Amount for personal loan = repay_amount (what they owe to repay)
                amount = str(debt.repay_amount) if debt.repay_amount is not None else str(debt.principal_amount)
                items.append(
                    OverviewItem(
                        id=str(debt.id),
                        source_type="debt",
                        name=debt.name,
                        amount=amount,
                        frequency="one_time",
                        category=debt.debt_type.value,
                        is_paid=is_paid,
                        payment_record_id=str(pr.id) if pr else None,
                        marked_at=(
                            pr.marked_at.astimezone(timezone.utc).isoformat()
                            if pr and pr.marked_at
                            else None
                        ),
                        debt_category=debt.debt_category.value,
                        is_fully_paid=debt.is_fully_paid,
                        lender_name=debt.lender_name,
                    )
                )

    # ── Expenses ──────────────────────────────────────────────────────────────
    if type_filter in ("all", "expense"):
        expense_result = await db.execute(
            select(Expense).where(
                and_(
                    Expense.user_id == user_id,
                    Expense.deleted_at.is_(None),
                    (
                        (
                            (Expense.frequency != ExpFreq.one_time)
                            & (Expense.is_active.is_(True))
                            & (
                                (Expense.start_date.is_(None))
                                | (Expense.start_date <= period_end)
                            )
                            & (
                                (Expense.end_date.is_(None))
                                | (Expense.end_date >= period_start)
                            )
                        )
                        | (
                            (Expense.frequency == ExpFreq.one_time)
                            & (Expense.transaction_date >= period_start)
                            & (Expense.transaction_date <= period_end)
                        )
                    ),
                )
            )
        )
        expenses = expense_result.scalars().all()

        expense_ids = [e.id for e in expenses]
        expense_payment_map: dict[uuid.UUID, MonthlyPaymentRecord] = {}
        if expense_ids:
            pr_result = await db.execute(
                select(MonthlyPaymentRecord).where(
                    and_(
                        MonthlyPaymentRecord.user_id == user_id,
                        MonthlyPaymentRecord.source_type == MonthlyPaymentSourceType.expense,
                        MonthlyPaymentRecord.source_id.in_(expense_ids),
                        MonthlyPaymentRecord.period_key == period_key,
                    )
                )
            )
            for pr in pr_result.scalars().all():
                expense_payment_map[pr.source_id] = pr

        for exp in expenses:
            pr = expense_payment_map.get(exp.id)
            is_paid = (pr is not None and pr.status == MonthlyPaymentStatus.paid)
            items.append(
                OverviewItem(
                    id=str(exp.id),
                    source_type="expense",
                    name=exp.name,
                    amount=str(exp.amount),
                    frequency=exp.frequency.value,
                    category=exp.expense_type.value,
                    is_paid=is_paid,
                    payment_record_id=str(pr.id) if pr else None,
                    marked_at=(
                        pr.marked_at.astimezone(timezone.utc).isoformat()
                        if pr and pr.marked_at
                        else None
                    ),
                )
            )

    # ── Incomes ───────────────────────────────────────────────────────────────
    if type_filter in ("all", "income"):
        income_result = await db.execute(
            select(Income).where(
                and_(
                    Income.user_id == user_id,
                    Income.deleted_at.is_(None),
                    (
                        (
                            (Income.frequency != IncomeFrequency.one_time)
                            & (Income.is_active.is_(True))
                            & (
                                (Income.start_date.is_(None))
                                | (Income.start_date <= period_end)
                            )
                            & (
                                (Income.end_date.is_(None))
                                | (Income.end_date >= period_start)
                            )
                        )
                        | (
                            (Income.frequency == IncomeFrequency.one_time)
                            & (Income.transaction_date >= period_start)
                            & (Income.transaction_date <= period_end)
                        )
                    ),
                )
            )
        )
        incomes = income_result.scalars().all()

        for inc in incomes:
            items.append(
                OverviewItem(
                    id=str(inc.id),
                    source_type="income",
                    name=inc.name,
                    amount=str(inc.amount),
                    frequency=inc.frequency.value,
                    category=inc.income_type.value,
                )
            )

    # ── Sort: debt → expense → income, then by name ───────────────────────────
    sort_order = {"debt": 0, "expense": 1, "income": 2}
    items.sort(key=lambda x: (sort_order.get(x.source_type, 9), x.name))

    # ── Summary ───────────────────────────────────────────────────────────────
    total_income = sum(
        Decimal(i.amount) for i in items if i.source_type == "income"
    )
    total_expense = sum(
        Decimal(i.amount) for i in items if i.source_type == "expense"
    )
    total_debt_payment = sum(
        Decimal(i.amount) for i in items if i.source_type == "debt"
    )
    net_cashflow = total_income - total_expense - total_debt_payment

    debt_expense_items = [i for i in items if i.source_type in ("debt", "expense")]
    paid_count = sum(1 for i in debt_expense_items if i.is_paid)
    unpaid_count = sum(1 for i in debt_expense_items if not i.is_paid)

    summary = OverviewSummary(
        total_income=str(total_income),
        total_expense=str(total_expense),
        total_debt_payment=str(total_debt_payment),
        net_cashflow=str(net_cashflow),
        paid_count=paid_count,
        unpaid_count=unpaid_count,
    )

    return MonthlyOverviewResponse(period=period_key, summary=summary, items=items)
