"""
Telegram Channel
Sends monthly report via Telegram Bot API using httpx.
Message is formatted with Markdown (not HTML — simpler for Telegram).
"""
import logging

import httpx

from app.core.config import settings
from app.schemas.monthly_overview import MonthlyOverviewResponse

logger = logging.getLogger("app.scheduler.channels.telegram")


def _fmt_vnd(value: str) -> str:
    try:
        from decimal import Decimal
        return f"{int(Decimal(value)):,} ₫"
    except Exception:
        return value


def _build_message(overview: MonthlyOverviewResponse, period_key: str) -> str:
    year_month = period_key.split("-")
    display_period = f"Tháng {year_month[1]}/{year_month[0]}" if len(year_month) == 2 else period_key

    s = overview.summary
    lines = [
        f"📅 *Báo Cáo Tài Chính — {display_period}*",
        "",
        f"💰 TỔNG THU NHẬP:    `{_fmt_vnd(s.total_income)}`",
        f"💸 TỔNG CHI TIÊU:    `{_fmt_vnd(s.total_expense)}`",
        f"💳 TỔNG TRẢ NỢ:      `{_fmt_vnd(s.total_debt_payment)}`",
        f"📊 DÒNG TIỀN RÒNG:   `{_fmt_vnd(s.net_cashflow)}`",
        "",
        f"✅ Đã xử lý: {s.paid_count} / {s.paid_count + s.unpaid_count}",
    ]

    # Top expenses
    top_expenses = [i for i in overview.items if i.source_type == "expense"][:5]
    if top_expenses:
        lines += ["", "--- *TOP CHI TIÊU* ---"]
        for idx, item in enumerate(top_expenses, 1):
            status = "✅" if item.is_paid else "❌"
            lines.append(f"{idx}. {item.name} — `{_fmt_vnd(item.amount)}` {status}")

    # Debts
    debts = [i for i in overview.items if i.source_type == "debt"]
    if debts:
        lines += ["", "--- *NỢ CẦN TRẢ* ---"]
        for idx, item in enumerate(debts, 1):
            status = "✅ Đã trả" if item.is_paid else "❌ Chưa trả"
            lines.append(f"{idx}. {item.name} — `{_fmt_vnd(item.amount)}` {status}")

    # Incomes
    incomes = [i for i in overview.items if i.source_type == "income"]
    if incomes:
        lines += ["", "--- *THU NHẬP* ---"]
        for idx, item in enumerate(incomes, 1):
            lines.append(f"{idx}. {item.name} — `{_fmt_vnd(item.amount)}`")

    return "\n".join(lines)


async def send_telegram_report(
    overview: MonthlyOverviewResponse,
    period_key: str,
) -> None:
    """
    Send the monthly report to the configured Telegram chat.
    Raises on API error so caller can retry.
    """
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        raise ValueError("Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)")

    message = _build_message(overview, period_key)
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            url,
            json={
                "chat_id": settings.TELEGRAM_CHAT_ID,
                "text": message,
                "parse_mode": "Markdown",
            },
        )

    if resp.status_code != 200:
        raise RuntimeError(f"Telegram API error {resp.status_code}: {resp.text}")

    logger.info("Telegram report sent for period %s", period_key)
