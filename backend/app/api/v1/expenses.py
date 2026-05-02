import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_cache
from app.core.database import get_db
from app.models.expense import Expense, Frequency
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseRead, ExpenseUpdate
from app.services.cache_service import CacheService

router = APIRouter(prefix="/expenses", tags=["expenses"])


from sqlalchemy import extract, or_, and_, select
from datetime import date
import calendar

@router.get("", response_model=List[ExpenseRead])
async def list_expenses(
    frequency: Optional[Frequency] = Query(None),
    active: Optional[bool] = Query(None),
    current_month: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = [Expense.deleted_at.is_(None), Expense.user_id == current_user.id]
    if frequency:
        filters.append(Expense.frequency == frequency)
    if active is not None:
        filters.append(Expense.is_active == active)

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
                    extract('year', Expense.transaction_date) == year,
                    extract('month', Expense.transaction_date) == month
                ),
                and_(
                    Expense.start_date <= end_of_month,
                    or_(
                        Expense.end_date >= start_of_month,
                        Expense.end_date.is_(None)
                    )
                )
            )
            filters.append(condition)
        except ValueError:
            pass # ignore invalid formats

    result = await db.execute(select(Expense).where(and_(*filters)))
    return result.scalars().all()


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
async def create_expense(
    payload: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    expense = Expense(**payload.model_dump(), user_id=current_user.id)
    db.add(expense)
    await db.flush()
    await cache.invalidate_dashboard(str(current_user.id))
    return expense


@router.put("/{expense_id}", response_model=ExpenseRead)
async def update_expense(
    expense_id: uuid.UUID,
    payload: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    result = await db.execute(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.user_id == current_user.id,
            Expense.deleted_at.is_(None),
        )
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Expense not found", "code": "NOT_FOUND"},
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)

    await db.flush()
    await cache.invalidate_dashboard(str(current_user.id))
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    result = await db.execute(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.user_id == current_user.id,
            Expense.deleted_at.is_(None),
        )
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Expense not found", "code": "NOT_FOUND"},
        )

    expense.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await cache.invalidate_dashboard(str(current_user.id))
