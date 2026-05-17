"""
Monthly Report Job
Runs at 22:00 on the last day of each month.
Fetches all active users, generates their monthly overview,
and dispatches via email + telegram channels independently.
"""
import asyncio
import logging
from datetime import date, timezone, datetime

from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User
from app.services.notification_service import send_monthly_report

logger = logging.getLogger("app.scheduler.jobs.monthly_report")


async def _run_for_all_users(period_key: str) -> None:
    async for db in get_db():
        try:
            # Fetch all non-deleted users
            result = await db.execute(
                select(User).where(User.deleted_at.is_(None))
            )
            users = result.scalars().all()
            logger.info("Monthly report job: found %d user(s) for period %s", len(users), period_key)

            for user in users:
                try:
                    results = await send_monthly_report(db, user, period_key)
                    logger.info(
                        "Report sent for user %s (period %s): email=%s telegram=%s",
                        user.id,
                        period_key,
                        results.get("email", {}).get("success"),
                        results.get("telegram", {}).get("success"),
                    )
                except Exception as user_exc:
                    logger.error(
                        "Failed to send report for user %s: %s", user.id, user_exc, exc_info=True
                    )
                    # Continue to next user — don't abort the whole job

            await db.commit()
        except Exception as exc:
            logger.error("Monthly report job failed: %s", exc, exc_info=True)
            await db.rollback()


def monthly_report_job() -> None:
    """Entry point called by APScheduler (sync wrapper around async logic)."""
    today = date.today()
    period_key = today.strftime("%Y-%m")
    logger.info("Monthly report job triggered for period %s", period_key)
    asyncio.create_task(_run_for_all_users(period_key))
