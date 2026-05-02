# backend.md — AI Agent Guide: Personal Finance Backend

## Overview
Build a **FastAPI** backend serving a personal finance management API. The backend handles authentication, CRUD for financial records, monthly aggregation, and on-demand AI analysis via OpenRouter.

---

## Tech Stack
| Component | Technology |
|---|---|
| Framework | FastAPI (async) |
| ORM | SQLAlchemy 2.x (async) |
| Migrations | Alembic |
| Database | PostgreSQL 16 (via Docker) |
| Cache | Redis 7 (via Docker) |
| Auth | JWT (python-jose + passlib) |
| AI Integration | OpenRouter HTTP client (httpx) |
| Config | pydantic-settings (.env) |
| Server | Uvicorn |

---

## Project Structure
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
│   │   │   └── ai_analysis.py
│   │   └── deps.py           # Shared dependencies (auth, db, cache)
│   ├── core/
│   │   ├── config.py         # pydantic-settings
│   │   ├── security.py       # JWT logic
│   │   └── database.py       # Async engine + session factory
│   ├── models/               # SQLAlchemy ORM models
│   ├── schemas/              # Pydantic request/response schemas
│   ├── services/             # Business logic layer
│   │   ├── ai_service.py     # OpenRouter integration
│   │   └── cache_service.py  # Redis wrapper
│   └── main.py
├── alembic/
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

## Database Schema Design

### Core Design Principles
- All tables include: `id (UUID)`, `created_at`, `updated_at`, `deleted_at` (soft delete)
- Use `deleted_at IS NULL` filter in all queries
- Financial amounts stored as `NUMERIC(15, 2)` — never float
- Currency field on each record (default: VND)

### Tables

#### `users`
Single user for personal use. Fields: `id`, `username`, `hashed_password`, `email`, `created_at`.

#### `debts`
Tracks loans and credit cards.
- `name`: label (e.g., "VPBank Credit Card")
- `debt_type`: enum → `credit_loan | credit_card | personal_loan | other`
- `principal_amount`: original amount borrowed
- `remaining_amount`: current balance
- `interest_rate`: annual rate (%)
- `monthly_payment`: fixed monthly installment
- `due_day`: day of month payment is due (1–31)
- `start_date`, `end_date`
- `status`: enum → `active | paid_off | paused`
- `notes`

#### `expenses`
Tracks all outgoing money.
- `name`: label (e.g., "YouTube Premium")
- `expense_type`: enum → `subscription | utility | food | transport | healthcare | entertainment | other`
- `amount`
- `frequency`: enum → `one_time | weekly | monthly | yearly`
- `billing_day`: day of month/week charged (nullable for one_time)
- `start_date`, `end_date` (nullable)
- `is_active`: boolean
- `category_id` (FK to categories, optional)
- `notes`

#### `incomes`
Tracks all incoming money.
- `name`: label (e.g., "Salary - Company A", "Trading Profit")
- `income_type`: enum → `salary | trading | freelance | passive | other`
- `amount`
- `frequency`: enum → `one_time | weekly | monthly | yearly`
- `payment_day`: day of month received
- `start_date`, `end_date`
- `is_active`: boolean
- `notes`

#### `transactions`
One-time or irregular entries that reference a parent record.
- `source_type`: enum → `debt | expense | income`
- `source_id`: FK to the parent record
- `amount`
- `transaction_date`
- `notes`

#### `monthly_snapshots`
Pre-computed monthly summary, created/updated at end of each month or on-demand.
- `period_key`: `YYYY-MM` string (unique)
- `total_income`, `total_expense`, `total_debt_payment`
- `net_cashflow`
- `snapshot_data`: JSONB (detailed breakdown per category)

#### `ai_analyses`
Stores AI analysis results per month.
- `period_key`: `YYYY-MM` (unique constraint)
- `prompt_used`: full prompt sent to OpenRouter
- `analysis_text`: AI response text
- `model_used`: e.g., `claude-3-haiku`
- `token_usage`: JSONB
- `created_at`

#### `categories` (optional enhancement)
- `name`, `color`, `icon`, `type` (expense/income)

---

## API Endpoints

### Authentication
```
POST /api/v1/auth/login          → Returns JWT access token
POST /api/v1/auth/refresh        → Refresh token
GET  /api/v1/auth/me             → Current user info
```

### Debts
```
GET    /api/v1/debts             → List all active debts
POST   /api/v1/debts             → Create new debt
GET    /api/v1/debts/{id}        → Get single debt
PUT    /api/v1/debts/{id}        → Update debt
DELETE /api/v1/debts/{id}        → Soft delete
```

### Expenses
```
GET    /api/v1/expenses          → List (filter: ?frequency=monthly&active=true)
POST   /api/v1/expenses          → Create
PUT    /api/v1/expenses/{id}     → Update
DELETE /api/v1/expenses/{id}     → Soft delete
```

### Incomes
```
GET    /api/v1/incomes           → List (filter: ?frequency=monthly&active=true)
POST   /api/v1/incomes           → Create
PUT    /api/v1/incomes/{id}      → Update
DELETE /api/v1/incomes/{id}      → Soft delete
```

### Dashboard
```
GET /api/v1/dashboard/summary?period=YYYY-MM
    → Returns: total_income, total_expense, total_debt, net_cashflow, breakdown_by_type
GET /api/v1/dashboard/monthly-trend?months=6
    → Returns: last N months cashflow trend data for chart
```

### AI Analysis
```
GET  /api/v1/ai/analysis?period=YYYY-MM
     → Check if analysis exists for period; return cached if yes
POST /api/v1/ai/analysis/generate?period=YYYY-MM
     → Trigger OpenRouter call; save result; return analysis
     → Returns 429 if analysis already exists for period (force=false)
     → Accepts ?force=true to regenerate
```

### Transactions (one-time entries)
```
GET    /api/v1/transactions      → List (filter: ?period=YYYY-MM&type=income)
POST   /api/v1/transactions      → Create one-time transaction
DELETE /api/v1/transactions/{id} → Soft delete
```

---

## Business Logic Rules

### Monthly Calculation Logic
When computing totals for a given `YYYY-MM` period:
1. Include all `monthly` frequency records that are `active` and within `start_date/end_date`
2. Include all `one_time` transactions where `transaction_date` falls within the period
3. For debts: count `monthly_payment` of all `active` debts
4. Sum separately: `total_income`, `total_expense`, `total_debt_payment`
5. `net_cashflow = total_income - total_expense - total_debt_payment`

### AI Analysis Flow
1. Frontend clicks "Phân tích AI" button → calls `GET /api/v1/ai/analysis?period=YYYY-MM`
2. If record exists in `ai_analyses` table → return immediately (no OpenRouter call)
3. If not exists → frontend shows "Generate" button → user confirms → calls `POST /api/v1/ai/analysis/generate`
4. Backend computes monthly summary for the period
5. Constructs prompt with financial data in Vietnamese context
6. Calls OpenRouter API (model: configurable via env, default `claude-3-haiku`)
7. Saves result to `ai_analyses` table
8. Also caches in Redis with key `ai_analysis:{period_key}` TTL 24h
9. Returns analysis to frontend

### Prompt Construction (AI Analysis)
The prompt should include:
- Period summary: total income, expense, debt payments, net cashflow
- Breakdown: income by type, expenses by category
- Top 3 largest expense items
- Debt status overview
- Comparison vs previous month (if snapshot exists)
- Instruction: respond in Vietnamese, be actionable, suggest improvements

### Caching Strategy (Redis)
- `dashboard_summary:{user_id}:{period_key}` → TTL 1 hour
- `monthly_trend:{user_id}` → TTL 30 minutes
- `ai_analysis:{period_key}` → TTL 24 hours
- Invalidate dashboard cache on any write operation to debts/expenses/incomes/transactions

---

## Alembic Migration Strategy
- One migration per table creation
- Always add `deleted_at` column from the start
- Seed initial user via migration or separate seed script

---

## Environment Variables (.env.example)
```
# Database
DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/finance_db

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# OpenRouter
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=anthropic/claude-3-haiku
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# App
APP_ENV=production
APP_HOST=0.0.0.0
APP_PORT=8000
CORS_ORIGINS=http://localhost:3000,http://frontend:3000
```

---

## Dockerfile Notes
- Base image: `python:3.12-slim`
- Use multi-stage build: `builder` (install deps) → `runtime` (copy wheels)
- Run Alembic migrations as entrypoint before starting Uvicorn
- Non-root user for security
- Healthcheck: `GET /health` endpoint

---

## Error Handling Standards
- All errors return: `{ "detail": "message", "code": "ERROR_CODE" }`
- 401: Unauthorized (invalid/expired JWT)
- 403: Forbidden
- 404: Record not found or soft-deleted
- 422: Validation error (FastAPI default)
- 429: AI analysis already exists for period
- 503: OpenRouter unavailable

---

## Key Implementation Notes
- Use `async/await` throughout — SQLAlchemy async sessions, httpx async client
- Never expose `deleted_at IS NOT NULL` records in any list endpoint
- All monetary calculations use Python `Decimal` — never `float`
- Validate `period_key` format as `YYYY-MM` at API level
- OpenRouter API key must never be logged or returned to frontend
