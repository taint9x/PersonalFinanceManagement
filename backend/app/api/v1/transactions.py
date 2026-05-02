import uuid
from datetime import datetime, timezone, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_cache
from app.core.database import get_db
from app.models.transaction import Transaction, SourceType
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionRead
from app.services.cache_service import CacheService

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=List[TransactionRead])
async def list_transactions(
    period: Optional[str] = Query(None, regex=r"^\d{4}-\d{2}$"),
    type: Optional[SourceType] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import calendar

    filters = [Transaction.deleted_at.is_(None), Transaction.user_id == current_user.id]

    if period:
        year, month = int(period[:4]), int(period[5:7])
        last_day = calendar.monthrange(year, month)[1]
        period_start = date(year, month, 1)
        period_end = date(year, month, last_day)
        filters.append(Transaction.transaction_date >= period_start)
        filters.append(Transaction.transaction_date <= period_end)

    if type:
        filters.append(Transaction.source_type == type)

    result = await db.execute(select(Transaction).where(and_(*filters)))
    return result.scalars().all()


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    payload: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    transaction = Transaction(**payload.model_dump(), user_id=current_user.id)
    db.add(transaction)
    await db.flush()
    await cache.invalidate_dashboard(str(current_user.id))
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
            Transaction.deleted_at.is_(None),
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Transaction not found", "code": "NOT_FOUND"},
        )

    transaction.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await cache.invalidate_dashboard(str(current_user.id))
