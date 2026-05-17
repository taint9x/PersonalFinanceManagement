"""
Monthly Overview API
GET  /api/v1/monthly-overview            — unified list for selected month
POST /api/v1/monthly-overview/mark-paid  — UPSERT payment record as paid
POST /api/v1/monthly-overview/mark-unpaid— UPSERT payment record as unpaid
GET  /api/v1/monthly-overview/export/excel — StreamingResponse .xlsx
"""
import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_cache, get_current_user
from app.core.database import get_db
from app.models.debt import Debt, DebtCategory
from app.models.expense import Expense
from app.models.monthly_payment_record import (
    MonthlyPaymentRecord,
    MonthlyPaymentSourceType,
    MonthlyPaymentStatus,
)
from app.models.user import User
from app.schemas.debt import AddPersonalLoansPayload
from app.schemas.monthly_overview import (
    MarkPaymentPayload,
    MonthlyOverviewResponse,
    PaymentRecordRead,
)
from app.services.cache_service import CacheService
from app.services.excel_export_service import generate_excel
from app.services.monthly_overview_service import get_monthly_overview

router = APIRouter(prefix="/monthly-overview", tags=["monthly-overview"])

_PERIOD_RE = re.compile(r"^\d{4}-\d{2}$")


def _validate_period(period: str) -> None:
    if not _PERIOD_RE.match(period):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "Invalid period format. Use YYYY-MM.", "code": "INVALID_PERIOD"},
        )


# ── GET /monthly-overview ─────────────────────────────────────────────────────

@router.get("", response_model=MonthlyOverviewResponse)
async def monthly_overview(
    period: str = Query(..., description="YYYY-MM"),
    type: Optional[str] = Query("all", description="all | debt | expense | income"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    _validate_period(period)
    type_filter = type if type in ("all", "debt", "expense", "income") else "all"

    cache_key = f"monthly_overview:{current_user.id}:{period}"
    if type_filter == "all":
        cached = await cache.get(cache_key)
        if cached:
            return MonthlyOverviewResponse(**cached)

    result = await get_monthly_overview(db, period, current_user.id, type_filter)

    if type_filter == "all":
        await cache.set(cache_key, result.model_dump(), ttl=1800)  # 30 min

    return result


# ── POST /monthly-overview/mark-paid ─────────────────────────────────────────

@router.post("/mark-paid", response_model=PaymentRecordRead)
async def mark_paid(
    payload: MarkPaymentPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    _validate_period(payload.period_key)
    await _assert_source_exists(db, payload, current_user.id)

    record = await _upsert_payment_record(
        db, current_user.id, payload, MonthlyPaymentStatus.paid
    )
    await cache.delete(f"monthly_overview:{current_user.id}:{payload.period_key}")
    return record


# ── POST /monthly-overview/mark-unpaid ───────────────────────────────────────

@router.post("/mark-unpaid", response_model=PaymentRecordRead)
async def mark_unpaid(
    payload: MarkPaymentPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    _validate_period(payload.period_key)
    await _assert_source_exists(db, payload, current_user.id)

    record = await _upsert_payment_record(
        db, current_user.id, payload, MonthlyPaymentStatus.unpaid
    )
    await cache.delete(f"monthly_overview:{current_user.id}:{payload.period_key}")
    return record


# ── GET /monthly-overview/export/excel ───────────────────────────────────────

@router.get("/export/excel")
async def export_excel(
    period: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _validate_period(period)
    overview = await get_monthly_overview(db, period, current_user.id, "all")
    buf = generate_excel(overview, period)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=finance_{period}.xlsx"},
    )


# ── POST /monthly-overview/add-personal-loans ────────────────────────────────

@router.post("/add-personal-loans", response_model=List[PaymentRecordRead])
async def add_personal_loans_to_overview(
    payload: AddPersonalLoansPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    """
    Batch add selected personal_lump_sum loans to the monthly overview.
    Each debt_id gets an UPSERT into monthly_payment_records with status=paid.
    Atomic: if any upsert fails, all are rolled back.
    """
    _validate_period(payload.period_key)

    # Validate all debt_ids belong to current_user and are personal_lump_sum
    debt_result = await db.execute(
        select(Debt).where(
            and_(
                Debt.id.in_(payload.debt_ids),
                Debt.user_id == current_user.id,
                Debt.deleted_at.is_(None),
            )
        )
    )
    debts = {d.id: d for d in debt_result.scalars().all()}

    # Check all requested IDs were found
    for debt_id in payload.debt_ids:
        if debt_id not in debts:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"detail": f"Debt {debt_id} not found or not owned by user", "code": "NOT_FOUND"},
            )
        if debts[debt_id].debt_category != DebtCategory.personal_lump_sum:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"detail": f"Debt {debt_id} is not a personal_lump_sum debt", "code": "WRONG_DEBT_CATEGORY"},
            )

    # Atomic batch UPSERT
    now = datetime.now(timezone.utc)
    records: List[MonthlyPaymentRecord] = []
    for debt_id in payload.debt_ids:
        new_id = uuid.uuid4()
        stmt = (
            pg_insert(MonthlyPaymentRecord)
            .values(
                id=new_id,
                user_id=current_user.id,
                source_type=MonthlyPaymentSourceType.debt,
                source_id=debt_id,
                period_key=payload.period_key,
                status=MonthlyPaymentStatus.paid,
                note=None,
                marked_at=now,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_update(
                constraint="uq_monthly_payment_records_user_source_period",
                set_={
                    "status": MonthlyPaymentStatus.paid,
                    "marked_at": now,
                    "updated_at": now,
                },
            )
            .returning(MonthlyPaymentRecord)
        )
        result = await db.execute(stmt)
        records.append(result.scalar_one())

    await db.flush()

    # Invalidate caches
    await cache.delete(f"monthly_overview:{current_user.id}:{payload.period_key}")
    await cache.delete_pattern(f"personal_loans_available:{current_user.id}:*")

    return records


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _assert_source_exists(
    db: AsyncSession,
    payload: MarkPaymentPayload,
    user_id: uuid.UUID,
) -> None:
    """Ensure the referenced debt/expense exists and belongs to the current user."""
    if payload.source_type == MonthlyPaymentSourceType.debt:
        result = await db.execute(
            select(Debt).where(
                Debt.id == payload.source_id,
                Debt.user_id == user_id,
                Debt.deleted_at.is_(None),
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"detail": "Debt not found", "code": "NOT_FOUND"},
            )
    else:
        result = await db.execute(
            select(Expense).where(
                Expense.id == payload.source_id,
                Expense.user_id == user_id,
                Expense.deleted_at.is_(None),
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"detail": "Expense not found", "code": "NOT_FOUND"},
            )


async def _upsert_payment_record(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: MarkPaymentPayload,
    new_status: MonthlyPaymentStatus,
) -> MonthlyPaymentRecord:
    """
    UPSERT monthly_payment_records.
    On conflict (user_id, source_type, source_id, period_key): update status + marked_at + updated_at.
    Never deletes — preserves audit trail.
    """
    now = datetime.now(timezone.utc)
    new_id = uuid.uuid4()

    stmt = (
        pg_insert(MonthlyPaymentRecord)
        .values(
            id=new_id,
            user_id=user_id,
            source_type=payload.source_type,
            source_id=payload.source_id,
            period_key=payload.period_key,
            status=new_status,
            note=payload.note,
            marked_at=now,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_update(
            constraint="uq_monthly_payment_records_user_source_period",
            set_={
                "status": new_status,
                "note": payload.note,
                "marked_at": now,
                "updated_at": now,
            },
        )
        .returning(MonthlyPaymentRecord)
    )

    result = await db.execute(stmt)
    record = result.scalar_one()
    await db.flush()
    return record
