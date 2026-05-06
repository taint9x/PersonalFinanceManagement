"""
Scheduler Runner
Sets up APScheduler AsyncIOScheduler with the monthly report cron job.
Called from app/main.py lifespan — this module IMPORTS from app/ but app/ never imports from scheduler/.
"""
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings

logger = logging.getLogger("scheduler")

_scheduler: AsyncIOScheduler | None = None


def start_scheduler() -> None:
    global _scheduler

    from scheduler.jobs.monthly_report import monthly_report_job

    _scheduler = AsyncIOScheduler(timezone=settings.SCHEDULER_TIMEZONE)

    # Run at 22:00 on the last day of every month
    _scheduler.add_job(
        monthly_report_job,
        trigger=CronTrigger(day="last", hour=22, minute=0, timezone=settings.SCHEDULER_TIMEZONE),
        id="monthly_report_job",
        name="Monthly Financial Report",
        replace_existing=True,
        misfire_grace_time=3600,  # Allow up to 1h late start
    )

    _scheduler.start()
    logger.info("Scheduler started — monthly_report_job registered (last day of month @ 22:00 %s)", settings.SCHEDULER_TIMEZONE)


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler shut down.")
