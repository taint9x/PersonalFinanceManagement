"""
Personal Loans API
GET /api/v1/personal-loans/available?period=YYYY-MM
"""
import re
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_cache, get_current_user
from app.core.database import get_db
from app.models.debt import Debt, DebtCategory, DebtStatus
from app.models.monthly_payment_record import (
    MonthlyPaymentRecord,
    MonthlyPaymentSourceType,
)
from app.models.user import User
from app.schemas.monthly_overview import PersonalLoanAvailableRead
from app.services.cache_service import CacheService

router = APIRouter(prefix="/personal-loans", tags=["personal-loans"])

_PERIOD_RE = re.compile(r"^\d{4}-\d{2}$")


def _validate_period(period: str) -> None:
    if not _PERIOD_RE.match(period):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "Invalid period format. Use YYYY-MM.", "code": "INVALID_PERIOD"},
        )


def _period_range(period: str):
    import calendar
    from datetime import date
    year, month = period.split("-")
    year, month = int(year), int(month)
    first = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    last = date(year, month, last_day)
    return first, last


@router.get("/available", response_model=List[PersonalLoanAvailableRead])
async def get_personal_loans_available(
    period: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    """
    Returns all personal_lump_sum debts active in the given period
    that are not yet fully paid, along with whether each already has
    a monthly_payment_record for this period.
    """
    _validate_period(period)

    cache_key = f"personal_loans_available:{current_user.id}:{period}"
    cached = await cache.get(cache_key)
    if cached:
        return [PersonalLoanAvailableRead(**item) for item in cached]

    period_start, period_end = _period_range(period)

    # Fetch active personal loans for this period:
    # borrow_date <= last_day_of_period
    # AND (repay_date IS NULL OR repay_date >= first_day_of_period)
    # AND is_fully_paid = false
    from sqlalchemy import or_

    loan_result = await db.execute(
        select(Debt).where(
            and_(
                Debt.user_id == current_user.id,
                Debt.deleted_at.is_(None),
                Debt.debt_category == DebtCategory.personal_lump_sum,
                Debt.is_fully_paid.is_(False),
                Debt.borrow_date <= period_end,
                or_(Debt.repay_date.is_(None), Debt.repay_date >= period_start),
            )
        )
    )
    loans = loan_result.scalars().all()

    if not loans:
        await cache.set(cache_key, [], ttl=900)  # 15 min
        return []

    # Check which ones already have a monthly_payment_record for this period
    loan_ids = [loan.id for loan in loans]
    pr_result = await db.execute(
        select(MonthlyPaymentRecord.source_id).where(
            and_(
                MonthlyPaymentRecord.user_id == current_user.id,
                MonthlyPaymentRecord.source_type == MonthlyPaymentSourceType.debt,
                MonthlyPaymentRecord.source_id.in_(loan_ids),
                MonthlyPaymentRecord.period_key == period,
            )
        )
    )
    already_added_ids = {row[0] for row in pr_result.fetchall()}

    result = [
        PersonalLoanAvailableRead(
            id=str(loan.id),
            name=loan.name,
            lender_name=loan.lender_name or "",
            principal_amount=str(loan.principal_amount),
            repay_amount=str(loan.repay_amount) if loan.repay_amount is not None else str(loan.principal_amount),
            borrow_date=loan.borrow_date.isoformat() if loan.borrow_date else "",
            repay_date=loan.repay_date.isoformat() if loan.repay_date else None,
            already_in_overview=(loan.id in already_added_ids),
        )
        for loan in loans
    ]

    await cache.set(cache_key, [r.model_dump() for r in result], ttl=900)
    return result
