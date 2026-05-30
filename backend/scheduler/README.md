# Scheduler Module

This module is **isolated** — it imports FROM `app/` but `app/` never imports from `scheduler/` directly.

## Location

```
backend/scheduler/
├── __init__.py
├── runner.py                  # APScheduler setup + job registration
├── jobs/
│   └── monthly_report.py     # Core job logic
├── channels/
│   ├── email_channel.py      # aiosmtplib async email
│   └── telegram_channel.py   # Telegram Bot API via httpx
└── templates/
    └── monthly_report.html   # Jinja2 HTML email template
```

## Schedule

| Job | Trigger | Timezone |
|---|---|---|
| `monthly_report_job` | Last day of month, 22:00 | Asia/Ho_Chi_Minh |

## Channels

### Email
- Library: `aiosmtplib`
- Template: Jinja2 HTML (`templates/monthly_report.html`)
- Config: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `REPORT_TO_EMAIL`
- Supports STARTTLS (port 587) and SSL (port 465)

### Telegram
- Library: `httpx` (direct Bot API calls)
- Format: Markdown-formatted text
- Config: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

## Retry Behavior

Each channel retries up to 3 times on failure (5-second delay between retries).
Channels are independent — email failure does not prevent Telegram send.
All attempts are logged to `notification_logs` table.

## Enabling / Disabling

Set in `.env`:
```
SCHEDULER_ENABLED=true   # auto-send monthly
SCHEDULER_ENABLED=false  # disable auto-send (manual send via UI still works)
```

## Manual Testing

Use the "Gửi Báo Cáo Thủ Công" button in the app, or call:
```
POST /api/v1/notifications/send-now?period=YYYY-MM
```
