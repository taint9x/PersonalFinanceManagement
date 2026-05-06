"""
Notifications API
GET  /api/v1/notifications/history   — list of notification_logs for current user
POST /api/v1/notifications/send-now  — manually trigger a monthly report
"""
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.notification_log import NotificationLog
from app.models.user import User
from app.schemas.notification_log import NotificationLogRead

router = APIRouter(prefix="/notifications", tags=["notifications"])

_PERIOD_RE = re.compile(r"^\d{4}-\d{2}$")


@router.get("/history", response_model=List[NotificationLogRead])
async def notification_history(
    limit: int = Query(12, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotificationLog)
        .where(NotificationLog.user_id == current_user.id)
        .order_by(desc(NotificationLog.created_at))
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/send-now")
async def send_now(
    period: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _PERIOD_RE.match(period):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "Invalid period format. Use YYYY-MM.", "code": "INVALID_PERIOD"},
        )

    try:
        from app.services.notification_service import send_monthly_report
        results = await send_monthly_report(db, current_user, period)
        return {
            "status": "completed",
            "period": period,
            "results": results,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": f"Failed to send report: {str(exc)}", "code": "SEND_FAILED"},
        )
