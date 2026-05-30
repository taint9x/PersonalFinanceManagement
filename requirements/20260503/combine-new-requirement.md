# combine-new-requirement.md — New Requirements: Project Assembly Guide

## Overview
This document covers all project-level changes required by the new requirements:
- Docker Compose updates (new env vars, scheduler)
- Updated folder structure
- Updated `.env` with Email + Telegram credentials
- `documents/` updates
- Human setup guide for Email and Telegram integration

---

## Updated Project Structure

```
./
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env
├── .env.example
├── .gitignore
│
├── frontend/
│   └── src/
│       ├── pages/app/
│       │   ├── MonthlyOverviewPage.tsx   ← NEW
│       │   └── NotificationsPage.tsx     ← NEW
│       ├── components/overview/          ← NEW folder
│       └── components/notifications/     ← NEW folder
│
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── monthly_overview.py       ← NEW
│   │   │   └── notifications.py          ← NEW
│   │   ├── models/
│   │   │   ├── monthly_payment_record.py ← NEW
│   │   │   └── notification_log.py       ← NEW
│   │   └── services/
│   │       ├── monthly_overview_service.py ← NEW
│   │       ├── excel_export_service.py     ← NEW
│   │       └── notification_service.py     ← NEW
│   │
│   └── scheduler/                         ← NEW isolated module
│       ├── __init__.py
│       ├── runner.py
│       ├── jobs/
│       │   └── monthly_report.py
│       ├── channels/
│       │   ├── email_channel.py
│       │   └── telegram_channel.py
│       ├── templates/
│       │   └── monthly_report.html
│       └── README.md
│
└── documents/
    ├── README.md                    (update: mention new Overview tab, notifications)
    ├── TECH_STACK.md                (update: add openpyxl, aiosmtplib, APScheduler)
    ├── API_REFERENCE.md             (update: add new endpoints)
    ├── DATABASE_SCHEMA.md           (update: add 2 new tables)
    ├── SETUP_GUIDE.md               (update: mention Email/Telegram setup)
    ├── ARCHITECTURE.md              (update: add scheduler flow diagram)
    ├── AI_INTEGRATION.md            (no change)
    ├── EMAIL_SETUP.md               ← NEW (human integration guide)
    └── TELEGRAM_SETUP.md            ← NEW (human integration guide)
```

---

## Docker Compose Changes

### No new services needed
The scheduler runs **inside the existing `backend` container** as an APScheduler background job (not a separate process). This keeps Docker Compose simple.

If the project grows and requires isolated scheduling, it can be extracted to a separate container later with a `docker-compose.override.yml`.

### Backend service: new env vars injected
Add the following to the `backend` service in `docker-compose.yml` via `env_file: .env` (already configured — no structural change needed, only `.env` content update).

---

## Updated `.env` File

Full updated `.env` with new variables:

```bash
# ============================================
# Personal Finance App — Environment Variables
# ============================================

# --- PostgreSQL ---
POSTGRES_USER=financeapp
POSTGRES_PASSWORD=changeme_secure_password
POSTGRES_DB=finance_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

# --- Redis ---
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}/0

# --- JWT Authentication ---
JWT_SECRET_KEY=REPLACE_WITH_LONG_RANDOM_STRING_MIN_32_CHARS
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# --- Initial Admin User ---
INITIAL_USERNAME=admin
INITIAL_PASSWORD=changeme_on_first_login

# --- OpenRouter AI ---
OPENROUTER_API_KEY=sk-or-v1-REPLACE_WITH_YOUR_KEY
OPENROUTER_MODEL=anthropic/claude-3-haiku
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MAX_TOKENS=2000

# --- Email (SMTP) ---                         ← NEW
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your-app-password-here
SMTP_FROM=your@gmail.com
REPORT_TO_EMAIL=your@gmail.com

# --- Telegram ---                             ← NEW
TELEGRAM_BOT_TOKEN=REPLACE_WITH_YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=REPLACE_WITH_YOUR_CHAT_ID

# --- Scheduler ---                            ← NEW
SCHEDULER_ENABLED=true
SCHEDULER_TIMEZONE=Asia/Ho_Chi_Minh

# --- Application ---
APP_ENV=production
APP_HOST=0.0.0.0
APP_PORT=8000
CORS_ORIGINS=http://localhost:3000,http://frontend:3000
```

---

## Alembic Migrations (run order)

When deploying, the `entrypoint.sh` runs `alembic upgrade head` automatically. Ensure migration files are created in this order:

```
1. (existing) initial tables: users, debts, expenses, incomes, transactions, etc.
2. (existing) add user_id columns to debts, expenses, incomes    ← you already did this
3. (NEW) add_monthly_payment_records_table
4. (NEW) add_notification_logs_table
```

Each migration must have both `upgrade()` and `downgrade()` implemented.

---

## Updated `documents/` Files

### Files to UPDATE (add new content):

**`documents/README.md`** — add to feature list:
- Tổng Quan Tháng: xem toàn bộ thu chi nợ trong 1 tab, mark đã thanh toán
- Xuất Excel báo cáo tháng
- Báo cáo tự động cuối tháng qua Email và Telegram

**`documents/TECH_STACK.md`** — add new libraries:
| Library | Purpose |
|---|---|
| openpyxl | Server-side Excel generation |
| aiosmtplib | Async email sending via SMTP |
| Jinja2 | HTML email template rendering |
| APScheduler | Monthly cron job scheduler |

**`documents/API_REFERENCE.md`** — add new endpoints section:
- `GET /api/v1/monthly-overview`
- `POST /api/v1/monthly-overview/mark-paid`
- `POST /api/v1/monthly-overview/mark-unpaid`
- `GET /api/v1/monthly-overview/export/excel`
- `GET /api/v1/notifications/history`
- `POST /api/v1/notifications/send-now`

**`documents/DATABASE_SCHEMA.md`** — add new tables:
- `monthly_payment_records` (full column list)
- `notification_logs` (full column list)

**`documents/SETUP_GUIDE.md`** — add section:
```
## Step 6: Setup Email Notifications (Optional)
See documents/EMAIL_SETUP.md for detailed instructions.

## Step 7: Setup Telegram Notifications (Optional)  
See documents/TELEGRAM_SETUP.md for detailed instructions.

## Disabling Scheduler
If you don't want automatic monthly reports:
Set SCHEDULER_ENABLED=false in .env
```

---

### `documents/EMAIL_SETUP.md` — NEW FILE (full content below)

```markdown
# Email Setup Guide

This guide helps you configure the automatic monthly report email.

## Option A: Gmail (Recommended for personal use)

### Step 1: Enable 2-Factor Authentication on your Google account
1. Go to myaccount.google.com
2. Security → 2-Step Verification → Enable

### Step 2: Create an App Password
1. Go to myaccount.google.com → Security
2. Under "2-Step Verification" → click "App passwords"
3. Select app: "Mail", Select device: "Other" → type "FinanceApp"
4. Click Generate → Google gives you a 16-character password
5. Copy this password (you won't see it again)

### Step 3: Update your .env file
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.gmail@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx   ← the 16-char app password (spaces ok)
SMTP_FROM=your.gmail@gmail.com
REPORT_TO_EMAIL=your.gmail@gmail.com

### Step 4: Restart the backend
docker compose restart backend

### Step 5: Test
Go to the app → Lịch Sử Báo Cáo → Gửi Báo Cáo Thủ Công → select a month → confirm
Check your email inbox (may take 1-2 minutes).

---

## Option B: Other SMTP Providers

### Outlook / Hotmail
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your@outlook.com
SMTP_PASSWORD=your-account-password

### Zoho Mail
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=your@zohomail.com
SMTP_PASSWORD=your-zoho-password

### Custom SMTP (self-hosted)
Fill SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD with your server details.

---

## Troubleshooting

**"Authentication failed"**
→ For Gmail: Make sure you're using App Password, NOT your regular Google password.

**"Connection timeout"**
→ Check if your Docker host allows outbound SMTP (port 587). Some VPS providers block this.
→ Try SMTP_PORT=465 as alternative.

**Emails going to spam**
→ Check that SMTP_FROM matches SMTP_USER.
→ Consider setting up SPF/DKIM records for your domain.

**Test without sending**
→ Set SCHEDULER_ENABLED=false and use the "Gửi Thủ Công" button to test.
```

---

### `documents/TELEGRAM_SETUP.md` — NEW FILE (full content below)

```markdown
# Telegram Setup Guide

This guide helps you configure automatic monthly report messages via Telegram.

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send: /newbot
3. Choose a name: e.g., "My Finance Bot"
4. Choose a username: e.g., "myfinance_report_bot" (must end in 'bot')
5. BotFather gives you a token like:
   `1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi`
6. Copy this token → set as TELEGRAM_BOT_TOKEN in .env

## Step 2: Get your Chat ID

### Method A: Use @userinfobot
1. Search Telegram for **@userinfobot**
2. Start a chat and send /start
3. It replies with your user ID (a number like 987654321)
4. This number is your TELEGRAM_CHAT_ID

### Method B: Use the Bot API directly
1. First, send any message to your new bot (search it by username)
2. Open this URL in browser (replace TOKEN with yours):
   https://api.telegram.org/bot{TOKEN}/getUpdates
3. Find "chat" → "id" in the JSON response
4. That number is your TELEGRAM_CHAT_ID

## Step 3: Update your .env file
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi
TELEGRAM_CHAT_ID=987654321

## Step 4: Authorize your bot
Important: You must start a conversation with your bot FIRST.
1. Search for your bot by username in Telegram
2. Click START (or send /start)
3. The bot can now send you messages

## Step 5: Restart and test
docker compose restart backend

Go to app → Lịch Sử Báo Cáo → Gửi Báo Cáo Thủ Công → select month → confirm
Check your Telegram for the message (usually instant).

---

## Troubleshooting

**No message received after test**
→ Make sure you sent /start to your bot (Step 4 above).
→ Verify TELEGRAM_CHAT_ID is correct (should be a number, not a username).

**"Unauthorized" error in logs**
→ TELEGRAM_BOT_TOKEN is incorrect. Re-check with @BotFather → /mybots.

**"Chat not found" error**
→ You haven't started the bot yet. Send /start to your bot first.

**Bot token security**
→ Never share your bot token publicly.
→ If compromised: go to @BotFather → /revoke → get new token → update .env.

---

## How the Reports Look

Monthly reports are sent as formatted Telegram messages:

📅 Báo Cáo Tài Chính — Tháng 04/2025

💰 TỔNG THU NHẬP:    15,000,000 ₫
💸 TỔNG CHI TIÊU:     3,500,000 ₫
💳 TỔNG TRẢ NỢ:       3,500,000 ₫
📊 DÒNG TIỀN RÒNG:  +8,000,000 ₫

[list of items follows...]
```

---

## Scheduler Behavior Reference

For users who want to understand when reports are sent:

| Setting | Behavior |
|---|---|
| `SCHEDULER_ENABLED=true` | Auto-sends on last day of month at 22:00 (Asia/Ho_Chi_Minh) |
| `SCHEDULER_ENABLED=false` | No auto-send; manual send still works via app |
| Email disabled (empty vars) | Email channel skipped; Telegram still works |
| Telegram disabled (empty vars) | Telegram channel skipped; Email still works |
| Both disabled | Manual send button shows error; auto-send is no-op |

The app sends via both channels independently — if Email fails, Telegram still sends (and vice versa). Each attempt is logged separately in notification history.

---

## Testing Checklist for New Features

**Monthly Overview:**
- [ ] Tab shows correct items for selected month
- [ ] Recurring items appear if active and within date range
- [ ] One-time items appear only in their transaction month
- [ ] Type filter tabs correctly filter the list
- [ ] Income items have no mark button
- [ ] Debt/expense items show mark button
- [ ] Summary bar totals match Dashboard summary totals for same month

**Mark as Paid:**
- [ ] Clicking mark → button updates to paid state
- [ ] Paid count in status counter increments
- [ ] Clicking again → button reverts to unpaid
- [ ] On page refresh → paid state persists (comes from DB)
- [ ] Marking in month A does not affect month B

**Excel Export:**
- [ ] File downloads with filename `finance_YYYY-MM.xlsx`
- [ ] File has 4 sheets (Tổng Quan, Nợ, Chi Tiêu, Thu Nhập)
- [ ] Numbers in file match numbers shown in the UI
- [ ] Export includes payment status column for debt/expense sheets

**Notifications:**
- [ ] Manual send triggers both email and Telegram
- [ ] Notification history shows new entries after send
- [ ] History shows correct status (success/failed)
- [ ] Failed sends show error message in history
```
