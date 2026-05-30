import logging
import time
from typing import Any, Dict, Tuple

import httpx

from app.core.config import settings
from app.schemas.dashboard import MonthlySummary

# Uvicorn configures this logger to write to stdout/stderr in the container,
# so these lines show up in `docker logs finance_backend`.
logger = logging.getLogger("app.ai_services")


def _build_prompt(period_key: str, summary: MonthlySummary, prev_summary: MonthlySummary | None) -> str:
    lines = [
        f"Bạn là chuyên gia tài chính cá nhân. Hãy phân tích tình hình tài chính tháng {period_key} và đưa ra lời khuyên thực tế bằng tiếng Việt.",
        "",
        f"=== TỔNG QUAN THÁNG {period_key} ===",
        f"Tổng thu nhập:        {summary.total_income:,.0f} VND",
        f"Tổng chi tiêu:        {summary.total_expense:,.0f} VND",
        f"Tổng trả nợ:          {summary.total_debt_payment:,.0f} VND",
        f"Dòng tiền ròng:       {summary.net_cashflow:,.0f} VND",
        "",
        "=== CHI TIẾT THU NHẬP THEO LOẠI ===",
    ]

    for inc_type, amount in summary.breakdown.get("income_by_type", {}).items():
        lines.append(f"  - {inc_type}: {float(amount):,.0f} VND")

    lines += ["", "=== CHI TIẾT CHI TIÊU THEO LOẠI ==="]
    for exp_type, amount in summary.breakdown.get("expense_by_type", {}).items():
        lines.append(f"  - {exp_type}: {float(amount):,.0f} VND")

    top_expenses = summary.breakdown.get("top_expenses", [])
    if top_expenses:
        lines += ["", "=== TOP 3 CHI TIÊU LỚN NHẤT ==="]
        for i, exp in enumerate(top_expenses[:3], 1):
            lines.append(f"  {i}. {exp['name']} ({exp['type']}): {float(exp['amount']):,.0f} VND")

    debts = summary.breakdown.get("debts", [])
    if debts:
        lines += ["", "=== TÌNH TRẠNG NỢ ==="]
        for d in debts:
            lines.append(f"  - {d['name']}: trả {float(d['monthly_payment']):,.0f} VND/tháng [{d['status']}]")

    if prev_summary:
        lines += [
            "",
            f"=== SO SÁNH VỚI THÁNG TRƯỚC ({prev_summary.period_key}) ===",
            f"Thu nhập: {prev_summary.total_income:,.0f} → {summary.total_income:,.0f} VND",
            f"Chi tiêu: {prev_summary.total_expense:,.0f} → {summary.total_expense:,.0f} VND",
            f"Dòng tiền: {prev_summary.net_cashflow:,.0f} → {summary.net_cashflow:,.0f} VND",
        ]

    lines += [
        "",
        "=== YÊU CẦU ===",
        "1. Nhận xét tổng quan tình hình tài chính tháng này.",
        "2. Chỉ ra điểm tốt và điểm cần cải thiện.",
        "3. Đề xuất 3-5 hành động cụ thể để cải thiện tài chính.",
        "4. Nếu dòng tiền ròng âm, hãy ưu tiên các biện pháp cắt giảm chi tiêu.",
        "Hãy trả lời bằng tiếng Việt, rõ ràng và thực tế.",
    ]

    return "\n".join(lines)


async def generate_analysis(
    period_key: str,
    summary: MonthlySummary,
    prev_summary: MonthlySummary | None = None,
) -> Tuple[str, str, Dict[str, Any], str]:
    """
    Call OpenRouter API and return (analysis_text, model_used, token_usage).
    """
    prompt = _build_prompt(period_key, summary, prev_summary)

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://personal-finance-app",
        "X-Title": "Personal Finance Manager",
    }

    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 2048*10,
    }

    url = f"{settings.OPENROUTER_BASE_URL}/chat/completions"
    started_at = time.perf_counter()

    logger.info(
        "OpenRouter request started period=%s model=%s base_url=%s prompt_chars=%d",
        period_key,
        settings.OPENROUTER_MODEL,
        settings.OPENROUTER_BASE_URL,
        len(prompt),
    )
    logger.info("OpenRouter request prompt period=%s prompt=%r", period_key, prompt)

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            elapsed_ms = (time.perf_counter() - started_at) * 1000
            logger.info(
                "OpenRouter response received period=%s status_code=%s elapsed_ms=%.2f response_chars=%d",
                period_key,
                response.status_code,
                elapsed_ms,
                len(response.text),
            )
            logger.info(
                "OpenRouter raw response period=%s status_code=%s body=%s",
                period_key,
                response.status_code,
                response.text,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            elapsed_ms = (time.perf_counter() - started_at) * 1000
            logger.error(
                "OpenRouter HTTP error period=%s status_code=%s elapsed_ms=%.2f response_body=%s",
                period_key,
                exc.response.status_code,
                elapsed_ms,
                exc.response.text,
                exc_info=True,
            )
            raise
        except httpx.RequestError as exc:
            elapsed_ms = (time.perf_counter() - started_at) * 1000
            logger.error(
                "OpenRouter request failed period=%s elapsed_ms=%.2f error=%s",
                period_key,
                elapsed_ms,
                str(exc),
                exc_info=True,
            )
            raise

    data = response.json()
    analysis_text: str = data["choices"][0]["message"]["content"]
    model_used: str = data.get("model", settings.OPENROUTER_MODEL)
    token_usage: Dict[str, Any] = data.get("usage", {})

    logger.info(
        "OpenRouter analysis parsed period=%s requested_model=%s response_model=%s usage=%s analysis_chars=%d",
        period_key,
        settings.OPENROUTER_MODEL,
        model_used,
        token_usage,
        len(analysis_text),
    )
    logger.info(
        "OpenRouter analysis content period=%s analysis=%r",
        period_key,
        analysis_text,
    )

    return analysis_text, model_used, token_usage, prompt
