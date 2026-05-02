import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_cache
from app.core.database import get_db
from app.models.ai_analysis import AiAnalysis
from app.models.user import User
from app.schemas.ai_analysis import AiAnalysisRead, AiAnalysisNotFound
from app.services.ai_service import generate_analysis
from app.services.cache_service import CacheService
from app.services.dashboard_service import compute_monthly_summary

router = APIRouter(prefix="/ai", tags=["ai"])

PERIOD_REGEX = re.compile(r"^\d{4}-\d{2}$")


def _validate_period(period: str) -> None:
    if not PERIOD_REGEX.match(period):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"detail": "period must be in YYYY-MM format", "code": "INVALID_PERIOD"},
        )


@router.get("/analysis")
async def get_analysis(
    period: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    _validate_period(period)

    # 1. Check Redis cache (scoped per user)
    cache_key = f"ai_analysis:{current_user.id}:{period}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    # 2. Check DB (scoped to this user)
    result = await db.execute(
        select(AiAnalysis).where(
            AiAnalysis.user_id == current_user.id,
            AiAnalysis.period_key == period,
            AiAnalysis.deleted_at.is_(None),
        )
    )
    record = result.scalar_one_or_none()

    if record:
        read = AiAnalysisRead.model_validate(record)
        await cache.set(cache_key, read.model_dump(), ttl=86400)
        return read

    return AiAnalysisNotFound(exists=False, period_key=period)


@router.post("/analysis/generate", response_model=AiAnalysisRead)
async def generate_analysis_route(
    period: str = Query(..., description="YYYY-MM"),
    force: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    _validate_period(period)

    # Check if analysis already exists for this user
    result = await db.execute(
        select(AiAnalysis).where(
            AiAnalysis.user_id == current_user.id,
            AiAnalysis.period_key == period,
            AiAnalysis.deleted_at.is_(None),
        )
    )
    existing = result.scalar_one_or_none()

    if existing and not force:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "detail": "Analysis already exists for this period. Use ?force=true to regenerate.",
                "code": "ANALYSIS_EXISTS",
            },
        )

    # Compute financial summary for this user
    summary = await compute_monthly_summary(db, period, current_user.id)

    # Compute previous month summary for comparison
    year, month = int(period[:4]), int(period[5:7])
    if month == 1:
        prev_period = f"{year - 1}-12"
    else:
        prev_period = f"{year}-{month - 1:02d}"

    try:
        prev_summary = await compute_monthly_summary(db, prev_period, current_user.id)
    except Exception:
        prev_summary = None

    # Call OpenRouter
    try:
        analysis_text, model_used, token_usage, prompt_used = await generate_analysis(
            period, summary, prev_summary
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": "OpenRouter unavailable", "code": "AI_SERVICE_ERROR"},
        ) from exc

    # Soft-delete old record if forcing
    if existing and force:
        from datetime import datetime, timezone
        existing.deleted_at = datetime.now(timezone.utc)
        await db.flush()

    # Save new record scoped to this user
    record = AiAnalysis(
        user_id=current_user.id,
        period_key=period,
        prompt_used=prompt_used,
        analysis_text=analysis_text,
        model_used=model_used,
        token_usage=token_usage,
    )
    db.add(record)
    await db.flush()

    # Cache it (scoped per user)
    cache_key = f"ai_analysis:{current_user.id}:{period}"
    read = AiAnalysisRead.model_validate(record)
    await cache.set(cache_key, read.model_dump(), ttl=86400)

    return read
