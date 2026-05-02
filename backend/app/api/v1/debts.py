import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_cache
from app.core.database import get_db
from app.models.debt import Debt
from app.models.user import User
from app.schemas.debt import DebtCreate, DebtRead, DebtUpdate
from app.services.cache_service import CacheService

router = APIRouter(prefix="/debts", tags=["debts"])


@router.get("", response_model=List[DebtRead])
async def list_debts(
    current_month: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import calendar
    from datetime import date
    from sqlalchemy import and_, or_

    filters = [Debt.user_id == current_user.id, Debt.deleted_at.is_(None)]

    if current_month and len(current_month) == 6:
        month = int(current_month[:2])
        year = int(current_month[2:])
        last_day = calendar.monthrange(year, month)[1]
        period_start = date(year, month, 1)
        period_end = date(year, month, last_day)

        # Debt overlaps with the current month if:
        # start_date is before or during the month AND
        # (end_date is after or during the month OR end_date is None)
        # Or if start_date is None, maybe we just include it? Usually debts have start_date.
        # User requested: end_date >= current_month >= start_date
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

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(debt, field, value)

    await db.flush()
    await cache.invalidate_dashboard(str(current_user.id))
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
