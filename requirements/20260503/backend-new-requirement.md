# backend-new-requirement.md — AI Agent Guide: New Feature Backend

## Overview
This document extends `backend.md` with new requirements:
1. **Monthly Overview API** — unified view of all debts/expenses/incomes for a given month
2. **Payment Marking API** — mark a record as paid/spent for a specific month
3. **Excel Export API** — generate and stream Excel file of monthly data
4. **Scheduler Module** — monthly summary sent via Email + Telegram (isolated folder)

All new APIs follow the same patterns defined in `backend.md` (async SQLAlchemy, JWT auth, soft delete, Decimal for money).

---

## Database Changes

### New Table: `monthly_payment_records`
Tracks whether a recurring debt/expense record has been marked as paid/done for a given month. This is separate from `transactions` — it's a "checkbox" record, not a financial entry.

Columns:
- `id` (UUID, PK)
- `user_id` (UUID, FK → users) — required for multi-user safety
- `source_type` (enum): `debt | expense`  ← incomes không cần mark
- `source_id` (UUID) — references debts.id or expenses.id
- `period_key` (VARCHAR 7): `YYYY-MM`
- `status` (enum): `paid | unpaid` — default `paid` when created
- `note` (TEXT, nullable) — optional note when marking
- `marked_at` (TIMESTAMP) — when user first marked
- `updated_at` (TIMESTAMP)

**Unique constraint:** `(user_id, source_type, source_id, period_key)` — one record per item per month per user.

**Pattern:** Use UPSERT (`INSERT ... ON CONFLICT DO UPDATE`) so marking → unmarking → re-marking doesn't create duplicate rows.

---

### New Table: `notification_logs`
History of all scheduler-sent notifications.

Columns:
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `period_key` (VARCHAR 7): `YYYY-MM` — which month's report
- `channel` (enum): `email | telegram`
- `status` (enum): `success | failed | retrying`
- `attempt_count` (INTEGER, default 1)
- `error_message` (TEXT, nullable) — last error if failed
- `sent_at` (TIMESTAMP, nullable) — null if failed
- `created_at` (TIMESTAMP)

---

### Modified Tables (Alembic migrations required)
The following columns are confirmed already added by you:
- `debts.user_id` (UUID, FK → users)
- `expenses.user_id` (UUID, FK → users)
- `incomes.user_id` (UUID, FK → users)

No additional columns needed on existing tables.

---

## Updated Backend Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth.py
│   │   │   ├── debts.py
│   │   │   ├── expenses.py
│   │   │   ├── incomes.py
│   │   │   ├── dashboard.py
│   │   │   ├── ai_analysis.py
│   │   │   ├── monthly_overview.py     ← NEW
│   │   │   └── notifications.py        ← NEW (history log endpoint)
│   │   └── deps.py
│   ├── core/
│   ├── models/
│   │   ├── ...existing models...
│   │   ├── monthly_payment_record.py   ← NEW
│   │   └── notification_log.py         ← NEW
│   ├── schemas/
│   ├── services/
│   │   ├── ai_service.py
│   │   ├── cache_service.py
│   │   ├── monthly_overview_service.py ← NEW
│   │   ├── excel_export_service.py     ← NEW
│   │   └── notification_service.py     ← NEW (shared send logic)
│   └── main.py
│
├── scheduler/                           ← NEW ISOLATED MODULE
│   ├── __init__.py
│   ├── runner.py                        # APScheduler setup & job registration
│   ├── jobs/
│   │   └── monthly_report.py           # Core job logic
│   ├── channels/
│   │   ├── email_channel.py            # Email send logic
│   │   └── telegram_channel.py         # Telegram Bot API logic
│   ├── templates/
│   │   └── monthly_report.html         # Jinja2 HTML email template
│   └── README.md                       # Scheduler-specific docs
│
├── alembic/
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

## New API Endpoints

### Monthly Overview

```
GET /api/v1/monthly-overview?period=YYYY-MM
```

**Auth:** Bearer token required (extracts `user_id`)

**Query params:**
- `period` (required): `YYYY-MM` format
- `type` (optional): filter by `debt | expense | income | all` (default: `all`)

**Logic:**
1. Extract `user_id` from JWT
2. Parse `period` → `year`, `month` → compute `period_start` (first day) and `period_end` (last day)
3. For **one_time** records: filter where `transaction_date` falls within period_start–period_end
4. For **recurring** records (weekly/monthly/yearly): filter where `is_active = true` AND `start_date <= period_end` AND (`end_date IS NULL` OR `end_date >= period_start`)
5. For **debts**: all active debts (debts are inherently monthly recurring by `monthly_payment`)
6. For each debt/expense record: JOIN `monthly_payment_records` to attach `is_paid` flag for the given period
7. Return unified list sorted by: type group (debt → expense → income), then by name

**Response shape per item:**
```
{
  "id": "uuid",
  "source_type": "expense | debt | income",
  "name": "YouTube Premium",
  "amount": "79000.00",
  "frequency": "monthly",
  "category": "subscription",

  // For debts only:
  "due_day": 15,
  "remaining_amount": "5000000.00",

  // For expenses/debts only:
  "is_paid": true | false,
  "payment_record_id": "uuid | null",
  "marked_at": "2025-04-15T10:00:00Z | null"
}
```

**Summary block included in response:**
```
{
  "period": "2025-04",
  "summary": {
    "total_income": "...",
    "total_expense": "...",
    "total_debt_payment": "...",
    "net_cashflow": "...",
    "paid_count": 5,
    "unpaid_count": 3
  },
  "items": [...]
}
```

---

### Payment Marking

```
POST /api/v1/monthly-overview/mark-paid
```

**Body:**
```json
{
  "source_type": "expense | debt",
  "source_id": "uuid",
  "period_key": "YYYY-MM",
  "note": "optional note"
}
```

**Logic:** UPSERT into `monthly_payment_records` with `status = paid`. Returns the created/updated record.

---

```
POST /api/v1/monthly-overview/mark-unpaid
```

**Body:** same as mark-paid

**Logic:** UPSERT into `monthly_payment_records` with `status = unpaid`. Does NOT delete the row (preserves audit trail with `updated_at`).

---

### Excel Export

```
GET /api/v1/monthly-overview/export/excel?period=YYYY-MM
```

**Auth:** Bearer token required

**Logic:**
1. Run same query logic as `GET /monthly-overview?period=YYYY-MM`
2. Use `openpyxl` to generate Excel workbook in memory (`BytesIO`)
3. **Sheet 1 — Tổng Quan:** Summary block (total income/expense/debt, net cashflow)
4. **Sheet 2 — Nợ:** All debt records for month, columns: Tên, Loại, Số tiền trả/tháng, Còn lại, Ngày đến hạn, Trạng thái thanh toán
5. **Sheet 3 — Chi Tiêu:** All expense records, columns: Tên, Loại, Số tiền, Tần suất, Trạng thái thanh toán
6. **Sheet 4 — Thu Nhập:** All income records, columns: Tên, Loại, Số tiền, Tần suất
7. Apply minimal styling: header row bold + background color per sheet, currency columns right-aligned, auto-column width
8. Stream via `StreamingResponse` with header: `Content-Disposition: attachment; filename=finance_YYYY-MM.xlsx`

**Response:** Binary Excel file stream (not JSON).

---

### Notification History

```
GET /api/v1/notifications/history?limit=12
```

Returns list of `notification_logs` for current user, most recent first. Used by frontend to display "Lịch sử báo cáo tự động".

```
POST /api/v1/notifications/send-now?period=YYYY-MM
```

Manually trigger a report send for a given period (same logic as scheduler job). Useful for testing and for user to re-send a report on demand.

---

## Monthly Overview Service Logic

### Period Filtering Rules (critical)

```
For ONE_TIME records:
  WHERE transaction_date >= period_start AND transaction_date <= period_end

For RECURRING records (monthly/weekly/yearly):
  WHERE is_active = true
    AND start_date <= period_end
    AND (end_date IS NULL OR end_date >= period_start)

For DEBTS (always monthly):
  WHERE status = 'active'
    AND start_date <= period_end
    AND (end_date IS NULL OR end_date >= period_start)
```

All queries also filter `user_id = current_user.id` and `deleted_at IS NULL`.

### is_paid Attachment Logic
After fetching records, for each debt/expense item:
- Query `monthly_payment_records` WHERE `source_type = X AND source_id = Y AND period_key = Z AND user_id = current_user.id`
- If found and `status = paid` → `is_paid = true`
- If found and `status = unpaid` → `is_paid = false`
- If not found → `is_paid = false`

Do this via a single JOIN or a batch lookup (not N+1 queries).

---

## Scheduler Module

### Location: `backend/scheduler/`

This folder is a **fully isolated module**. It imports FROM `app/` (models, services, config) but `app/` never imports from `scheduler/`. This ensures clean separation.

### Scheduler: `runner.py`
- Uses **APScheduler** `AsyncIOScheduler`
- Job: `monthly_report_job` — runs at `cron: day=last, hour=22, minute=0` (22:00 on last day of month)
- Registered in `app/main.py` on startup via lifespan event
- Timezone: `Asia/Ho_Chi_Minh`

### Job Logic: `jobs/monthly_report.py`
Execution flow:
1. Determine `period_key` = current month (YYYY-MM)
2. Fetch all active users (or specific user for single-user app)
3. For each user:
   a. Compute monthly summary (reuse `monthly_overview_service`)
   b. Build report data structure (totals + top items per category)
   c. Try send via Email channel → log result
   d. Try send via Telegram channel → log result
   e. Write `notification_log` record for each channel attempt
4. On channel failure: retry up to 3 times with 5-minute delay
5. After all retries exhausted: log `status = failed` with error

### Channels: `channels/email_channel.py`
- Library: `aiosmtplib` (async SMTP)
- Template: Jinja2 HTML template (`templates/monthly_report.html`)
- Template renders: period header, summary table, top 5 expenses, top debts, net cashflow
- Config via env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `REPORT_TO_EMAIL`
- Supports STARTTLS (port 587) and SSL (port 465)

### Channels: `channels/telegram_channel.py`
- Uses Telegram Bot API directly via `httpx` (no library needed)
- Sends to a specific chat_id (user's personal chat with the bot)
- Message format: Markdown-formatted text (not HTML — simpler for Telegram)
- Sections: 📊 Tóm tắt tháng | 💸 Top chi tiêu | 💳 Nợ cần trả | 💰 Thu nhập
- Config via env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

### Report Template Content (both channels)
```
📅 Báo Cáo Tài Chính — Tháng MM/YYYY

💰 TỔNG THU NHẬP:     X,XXX,XXX ₫
💸 TỔNG CHI TIÊU:     X,XXX,XXX ₫
💳 TỔNG TRẢ NỢ:       X,XXX,XXX ₫
📊 DÒNG TIỀN RÒNG:    +X,XXX,XXX ₫  (or negative)

--- TOP CHI TIÊU ---
1. YouTube Premium     79,000 ₫  ✅ Đã chi
2. Điện nước          350,000 ₫  ✅ Đã chi
3. ...

--- NỢ CẦN TRẢ ---
1. VPBank Credit Card  1,500,000 ₫  ✅ Đã trả
2. Vay tiêu dùng      2,000,000 ₫  ❌ Chưa trả

--- THU NHẬP ---
1. Lương Công ty A    15,000,000 ₫
2. Trading              500,000 ₫
```

---

## New Environment Variables

Add to `.env`:
```
# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your@gmail.com
REPORT_TO_EMAIL=your@gmail.com

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-personal-chat-id

# Scheduler
SCHEDULER_ENABLED=true
SCHEDULER_TIMEZONE=Asia/Ho_Chi_Minh
```

---

## New Dependencies to add to requirements.txt
```
openpyxl>=3.1.0          # Excel generation
aiosmtplib>=3.0.0        # Async SMTP email
jinja2>=3.1.0            # Email HTML template rendering
apscheduler>=3.10.0      # Scheduler (may already be present)
```

---

## Alembic Migrations (new)
Create two new migration files, in order:
1. `add_monthly_payment_records_table`
2. `add_notification_logs_table`

Each migration is independent and reversible (has `upgrade` and `downgrade` defined).

---

## Caching Updates
Add to existing Redis cache invalidation rules:
- Invalidate `monthly_overview:{user_id}:{period_key}` when `monthly_payment_records` is upserted
- New cache key: `monthly_overview:{user_id}:{period_key}` → TTL 30 minutes

---

## Error Handling Additions
- `404` on mark-paid: source record not found or not owned by user
- `400` on export: invalid period format
- `503` on send-now: SMTP or Telegram API unreachable
- Scheduler failures: logged to `notification_logs`, do NOT raise to main app thread
