import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_cache
from app.core.database import get_db
from app.models.income import Income, IncomeFrequency
from app.models.user import User
from app.schemas.income import IncomeCreate, IncomeRead, IncomeUpdate
from app.services.cache_service import CacheService

router = APIRouter(prefix="/incomes", tags=["incomes"])


from sqlalchemy import extract, or_, and_, select
from datetime import date
import calendar

@router.get("", response_model=List[IncomeRead])
async def list_incomes(
    frequency: Optional[IncomeFrequency] = Query(None),
    active: Optional[bool] = Query(None),
    current_month: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = [Income.deleted_at.is_(None), Income.user_id == current_user.id]
    if frequency:
        filters.append(Income.frequency == frequency)
    if active is not None:
        filters.append(Income.is_active == active)

    if current_month:
        try:
            if len(current_month) == 6:
                month = int(current_month[:2])
                year = int(current_month[2:])
            else:
                parts = current_month.split('-')
                year = int(parts[0])
                month = int(parts[1])
                
            start_of_month = date(year, month, 1)
            _, last_day = calendar.monthrange(year, month)
            end_of_month = date(year, month, last_day)

            condition = or_(
                and_(
                    extract('year', Income.transaction_date) == year,
                    extract('month', Income.transaction_date) == month
                ),
                and_(
                    Income.start_date <= end_of_month,
                    or_(
                        Income.end_date >= start_of_month,
                        Income.end_date.is_(None)
                    )
                )
            )
            filters.append(condition)
        except ValueError:
            pass # ignore invalid formats

    result = await db.execute(select(Income).where(and_(*filters)))
    return result.scalars().all()


@router.post("", response_model=IncomeRead, status_code=status.HTTP_201_CREATED)
async def create_income(
    payload: IncomeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    income = Income(**payload.model_dump(), user_id=current_user.id)
    db.add(income)
    await db.flush()
    await cache.invalidate_dashboard(str(current_user.id))
    return income


@router.put("/{income_id}", response_model=IncomeRead)
async def update_income(
    income_id: uuid.UUID,
    payload: IncomeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    result = await db.execute(
        select(Income).where(
            Income.id == income_id,
            Income.user_id == current_user.id,
            Income.deleted_at.is_(None),
        )
    )
    income = result.scalar_one_or_none()
    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Income not found", "code": "NOT_FOUND"},
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(income, field, value)

    await db.flush()
    await cache.invalidate_dashboard(str(current_user.id))
    return income


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_income(
    income_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    result = await db.execute(
        select(Income).where(
            Income.id == income_id,
            Income.user_id == current_user.id,
            Income.deleted_at.is_(None),
        )
    )
    income = result.scalar_one_or_none()
    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Income not found", "code": "NOT_FOUND"},
        )

    income.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await cache.invalidate_dashboard(str(current_user.id))
