"""
Email Channel
Sends monthly report via async SMTP using aiosmtplib + Jinja2 HTML template.
Supports STARTTLS (port 587) and SSL (port 465).
"""
import logging
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import aiosmtplib
from jinja2 import Environment, FileSystemLoader

from app.core.config import settings
from app.schemas.monthly_overview import MonthlyOverviewResponse

logger = logging.getLogger("app.scheduler.channels.email")

_TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=True,
)


def _format_vnd(value: str) -> str:
    try:
        from decimal import Decimal
        return f"{int(Decimal(value)):,} ₫"
    except Exception:
        return value


async def send_email_report(
    overview: MonthlyOverviewResponse,
    period_key: str,
    to_email: str,
) -> None:
    """
    Render the HTML template and send via SMTP.
    Raises on connection/auth failure so caller can retry.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise ValueError("SMTP credentials not configured (SMTP_USER / SMTP_PASSWORD)")

    recipient = to_email or settings.REPORT_TO_EMAIL
    if not recipient:
        raise ValueError("No recipient email configured (REPORT_TO_EMAIL)")

    # Build template context
    year_month = period_key.split("-")
    display_period = f"Tháng {year_month[1]}/{year_month[0]}" if len(year_month) == 2 else period_key

    top_expenses = [i for i in overview.items if i.source_type == "expense"][:5]
    debts = [i for i in overview.items if i.source_type == "debt"]
    incomes = [i for i in overview.items if i.source_type == "income"]

    template = _jinja_env.get_template("monthly_report.html")
    html_body = template.render(
        period=display_period,
        summary=overview.summary,
        top_expenses=top_expenses,
        debts=debts,
        incomes=incomes,
        fmt_vnd=_format_vnd,
    )

    # Build MIME message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"📊 Báo Cáo Tài Chính — {display_period}"
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = recipient
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    # Send via aiosmtplib
    use_ssl = settings.SMTP_PORT == 465
    await aiosmtplib.send(
        msg,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        use_tls=use_ssl,
        start_tls=not use_ssl,
    )
    logger.info("Email report sent to %s for period %s", recipient, period_key)
