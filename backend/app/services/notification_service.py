"""
Notification Service
Shared logic for sending monthly reports via email and Telegram.
Called from both the scheduler jobs and the manual send-now API endpoint.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification_log import NotificationLog, NotificationChannel, NotificationStatus
from app.models.user import User
from app.services.monthly_overview_service import get_monthly_overview


async def _log_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    period_key: str,
    channel: NotificationChannel,
    status: NotificationStatus,
    attempt_count: int = 1,
    error_message: Optional[str] = None,
    sent_at: Optional[datetime] = None,
) -> NotificationLog:
    log = NotificationLog(
        user_id=user_id,
        period_key=period_key,
        channel=channel,
        status=status,
        attempt_count=attempt_count,
        error_message=error_message,
        sent_at=sent_at,
    )
    db.add(log)
    await db.flush()
    return log


async def send_monthly_report(
    db: AsyncSession,
    user: User,
    period_key: str,
) -> dict:
    """
    Send monthly report via all configured channels.
    Each channel is attempted independently — failure on one does not abort the other.
    Returns a dict with per-channel results.
    """
    # Import channels here to avoid circular imports at module load
    from scheduler.channels.email_channel import send_email_report
    from scheduler.channels.telegram_channel import send_telegram_report

    # Get data
    overview = await get_monthly_overview(db, period_key, user.id)
    results = {}

    # ── Email channel ─────────────────────────────────────────────────────────
    email_attempt = 1
    email_error: Optional[str] = None
    email_success = False
    MAX_RETRIES = 3

    if user.email:
        while email_attempt <= MAX_RETRIES:
            try:
                await send_email_report(overview, period_key, str(user.email or ""))
                email_success = True
                break
            except Exception as exc:
                email_error = str(exc)
                email_attempt += 1
                if email_attempt <= MAX_RETRIES:
                    import asyncio
                    await asyncio.sleep(5)  # 5-second retry (300s in production via scheduler)

    else:
        email_error = "You have no email configured"

    await _log_notification(
        db=db,
        user_id=user.id,
        period_key=period_key,
        channel=NotificationChannel.email,
        status=NotificationStatus.success if email_success else NotificationStatus.failed,
        attempt_count=email_attempt if email_success else MAX_RETRIES,
        error_message=None if email_success else email_error,
        sent_at=datetime.now(timezone.utc) if email_success else None,
    )
    results["email"] = {"success": email_success, "error": email_error}

    # ── Telegram channel ──────────────────────────────────────────────────────
    tg_attempt = 1
    tg_error: Optional[str] = None
    tg_success = False

    while tg_attempt <= MAX_RETRIES:
        try:
            await send_telegram_report(overview, period_key)
            tg_success = True
            break
        except Exception as exc:
            tg_error = str(exc)
            tg_attempt += 1
            if tg_attempt <= MAX_RETRIES:
                import asyncio
                await asyncio.sleep(5)

    await _log_notification(
        db=db,
        user_id=user.id,
        period_key=period_key,
        channel=NotificationChannel.telegram,
        status=NotificationStatus.success if tg_success else NotificationStatus.failed,
        attempt_count=tg_attempt if tg_success else MAX_RETRIES,
        error_message=None if tg_success else tg_error,
        sent_at=datetime.now(timezone.utc) if tg_success else None,
    )
    results["telegram"] = {"success": tg_success, "error": tg_error}

    return results
