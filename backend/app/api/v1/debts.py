import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_cache
from app.core.database import get_db
from app.models.debt import Debt, DebtCategory
from app.models.user import User
from app.schemas.debt import DebtCreate, DebtRead, DebtUpdate
from app.services.cache_service import CacheService

router = APIRouter(prefix="/debts", tags=["debts"])


@router.get("", response_model=List[DebtRead])
async def list_debts(
    current_month: Optional[str] = Query(None),
    category: Optional[str] = Query(None, description="monthly_installment | personal_lump_sum | all"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import calendar
    from datetime import date

    filters = [Debt.user_id == current_user.id, Debt.deleted_at.is_(None)]

    # Filter by debt_category if specified
    if category and category != "all":
        if category == "monthly_installment":
            filters.append(Debt.debt_category == DebtCategory.monthly_installment)
        elif category == "personal_lump_sum":
            filters.append(Debt.debt_category == DebtCategory.personal_lump_sum)

    if current_month and len(current_month) == 6:
        month = int(current_month[:2])
        year = int(current_month[2:])
        last_day = calendar.monthrange(year, month)[1]
        period_start = date(year, month, 1)
        period_end = date(year, month, last_day)

        from sqlalchemy import or_
        filters.append(
            and_(
                or_(Debt.start_date <= period_end, Debt.start_date.is_(None)),
                or_(Debt.end_date >= period_start, Debt.end_date.is_(None))
            )
        )

    result = await db.execute(select(Debt).where(and_(*filters)))
    return result.scalars().all()


@router.post("", response_model=DebtRead, status_code=status.HTTP_201_CREATED)
async def create_debt(
    payload: DebtCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    debt = Debt(**payload.model_dump(), user_id=current_user.id)
    db.add(debt)
    await db.flush()
    await cache.invalidate_dashboard(str(current_user.id))
    # Invalidate personal loans cache if creating a personal loan
    if payload.debt_category == DebtCategory.personal_lump_sum:
        await cache.delete_pattern(f"personal_loans_available:{current_user.id}:*")
    return debt


@router.get("/{debt_id}", response_model=DebtRead)
async def get_debt(
    debt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Debt).where(
            Debt.id == debt_id,
            Debt.user_id == current_user.id,
            Debt.deleted_at.is_(None),
        )
    )
    debt = result.scalar_one_or_none()
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Debt not found", "code": "NOT_FOUND"},
        )
    return debt


@router.put("/{debt_id}", response_model=DebtRead)
async def update_debt(
    debt_id: uuid.UUID,
    payload: DebtUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    result = await db.execute(
        select(Debt).where(
            Debt.id == debt_id,
            Debt.user_id == current_user.id,
            Debt.deleted_at.is_(None),
        )
    )
    debt = result.scalar_one_or_none()
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Debt not found", "code": "NOT_FOUND"},
        )

    # debt_category cannot be changed after creation — exclude from update
    update_data = payload.model_dump(exclude_unset=True)
    update_data.pop("debt_category", None)

    for field, value in update_data.items():
        setattr(debt, field, value)

    await db.flush()
    await cache.invalidate_dashboard(str(current_user.id))
    if debt.debt_category == DebtCategory.personal_lump_sum:
        await cache.delete_pattern(f"personal_loans_available:{current_user.id}:*")
    return debt


@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_debt(
    debt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    result = await db.execute(
        select(Debt).where(
            Debt.id == debt_id,
            Debt.user_id == current_user.id,
            Debt.deleted_at.is_(None),
        )
    )
    debt = result.scalar_one_or_none()
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Debt not found", "code": "NOT_FOUND"},
        )

    debt.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await cache.invalidate_dashboard(str(current_user.id))
    if debt.debt_category == DebtCategory.personal_lump_sum:
        await cache.delete_pattern(f"personal_loans_available:{current_user.id}:*")


# ── POST /debts/{id}/mark-fully-paid ─────────────────────────────────────────

@router.post("/{debt_id}/mark-fully-paid", response_model=DebtRead)
async def mark_fully_paid(
    debt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    """Mark a personal_lump_sum debt as fully repaid."""
    result = await db.execute(
        select(Debt).where(
            Debt.id == debt_id,
            Debt.user_id == current_user.id,
            Debt.deleted_at.is_(None),
        )
    )
    debt = result.scalar_one_or_none()
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Debt not found", "code": "NOT_FOUND"},
        )
    if debt.debt_category != DebtCategory.personal_lump_sum:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "This endpoint is only for personal_lump_sum debts", "code": "WRONG_DEBT_CATEGORY"},
        )
    if debt.is_fully_paid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "Debt is already fully paid", "code": "DEBT_ALREADY_FULLY_PAID"},
        )

    debt.is_fully_paid = True
    debt.actual_repaid_date = datetime.now(timezone.utc)
    await db.flush()
    await cache.delete_pattern(f"personal_loans_available:{current_user.id}:*")
    return debt


# ── POST /debts/{id}/unmark-fully-paid ───────────────────────────────────────

@router.post("/{debt_id}/unmark-fully-paid", response_model=DebtRead)
async def unmark_fully_paid(
    debt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    """Revert full repayment for a personal_lump_sum debt."""
    result = await db.execute(
        select(Debt).where(
            Debt.id == debt_id,
            Debt.user_id == current_user.id,
            Debt.deleted_at.is_(None),
        )
    )
    debt = result.scalar_one_or_none()
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Debt not found", "code": "NOT_FOUND"},
        )
    if debt.debt_category != DebtCategory.personal_lump_sum:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "This endpoint is only for personal_lump_sum debts", "code": "WRONG_DEBT_CATEGORY"},
        )

    debt.is_fully_paid = False
    debt.actual_repaid_date = None
    await db.flush()
    await cache.delete_pattern(f"personal_loans_available:{current_user.id}:*")
    return debt
