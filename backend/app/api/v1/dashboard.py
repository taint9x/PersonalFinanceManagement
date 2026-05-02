import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_cache
from app.core.database import get_db
from app.models.user import User
from app.schemas.dashboard import MonthlySummary, MonthlyTrendResponse
from app.services.cache_service import CacheService
from app.services.dashboard_service import compute_monthly_summary, get_monthly_trend

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

PERIOD_REGEX = re.compile(r"^\d{4}-\d{2}$")


def _validate_period(period: str) -> None:
    if not PERIOD_REGEX.match(period):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"detail": "period must be in YYYY-MM format", "code": "INVALID_PERIOD"},
        )


@router.get("/summary", response_model=MonthlySummary)
async def get_summary(
    period: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    _validate_period(period)
    cache_key = f"dashboard_summary:{current_user.id}:{period}"

    cached = await cache.get(cache_key)
    if cached:
        return MonthlySummary(**cached)

    summary = await compute_monthly_summary(db, period, current_user.id)
    await cache.set(cache_key, summary.model_dump(), ttl=3600)
    return summary


@router.get("/monthly-trend", response_model=MonthlyTrendResponse)
async def get_monthly_trend_route(
    months: int = Query(6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    cache_key = f"monthly_trend:{current_user.id}"
    cached = await cache.get(cache_key)
    if cached and cached.get("months") == months:
        return MonthlyTrendResponse(**cached)

    data = await get_monthly_trend(db, months, current_user.id)
    response = MonthlyTrendResponse(months=months, data=data)
    await cache.set(cache_key, response.model_dump(), ttl=1800)
    return response
