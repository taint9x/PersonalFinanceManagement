# Database Migration Manual

> **Scope:** Migrations `011` and `012` introduced as part of the Monthly Financial Overview & Automated Reporting feature (2026-05-04).

---

## Overview

Two new migrations were added on top of the existing `93b2653e2316` head:

| # | Revision ID | File | What it adds |
|---|---|---|---|
| 1 | `011` | `011_add_monthly_payment_records.py` | Payment tracking table + 2 enum types |
| 2 | `012` | `012_add_notification_logs.py` | Notification history table + 2 enum types |

### Migration chain

```
... → 93b2653e2316 (make email nullable)
          ↓
        011 (add monthly_payment_records)
          ↓
        012 (add notification_logs)   ← HEAD
```

---

## Migration 011 — `monthly_payment_records`

**File:** `backend/alembic/versions/011_add_monthly_payment_records.py`
**Revises:** `93b2653e2316`

### Purpose

Tracks whether a recurring debt or expense has been marked as paid/handled for a given month period. This is a **checkbox record**, not a financial entry — it stores user intent, not money movement.

### New Enum Types

| Type name | Values |
|---|---|
| `monthlypaymentsourcetype` | `'debt'`, `'expense'` |
| `monthlypaymentstatus` | `'paid'`, `'unpaid'` |

### New Table: `monthly_payment_records`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | NOT NULL | — | FK → `users.id` |
| `source_type` | `monthlypaymentsourcetype` | NOT NULL | — | `'debt'` or `'expense'` |
| `source_id` | `UUID` | NOT NULL | — | ID in `debts` or `expenses` table |
| `period_key` | `VARCHAR(7)` | NOT NULL | — | Format: `YYYY-MM` e.g. `2025-04` |
| `status` | `monthlypaymentstatus` | NOT NULL | `'paid'` | Toggle value |
| `note` | `TEXT` | NULL | — | Optional user note |
| `marked_at` | `TIMESTAMPTZ` | NULL | — | When user first marked |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Auto-set |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Auto-set |

### Constraints & Indexes

```sql
-- Unique: one record per user per item per month
UNIQUE (user_id, source_type, source_id, period_key)
  → "uq_monthly_payment_records_user_source_period"

-- Indexes
INDEX ix_monthly_payment_records_user_id       ON (user_id)
INDEX ix_monthly_payment_records_period_key    ON (period_key)
INDEX ix_monthly_payment_records_source        ON (source_type, source_id)
```

### Implementation Notes

> [!NOTE]
> The migration creates the table with `VARCHAR` columns first, then `ALTER COLUMN ... TYPE ... USING` to cast to enum. This is required because SQLAlchemy's `create_table` tries to auto-create enum types from metadata, conflicting with the manually issued `CREATE TYPE`. The two-step approach avoids this.

```sql
-- Step 1: CREATE TYPE (before table)
CREATE TYPE monthlypaymentsourcetype AS ENUM ('debt', 'expense');
CREATE TYPE monthlypaymentstatus    AS ENUM ('paid', 'unpaid');

-- Step 2: CREATE TABLE with VARCHAR
CREATE TABLE monthly_payment_records ( ... source_type VARCHAR(20), status VARCHAR(10) ... );

-- Step 3: ALTER COLUMN to cast to enum
ALTER TABLE monthly_payment_records
  ALTER COLUMN source_type TYPE monthlypaymentsourcetype
    USING source_type::monthlypaymentsourcetype;

ALTER TABLE monthly_payment_records ALTER COLUMN status DROP DEFAULT;
ALTER TABLE monthly_payment_records
  ALTER COLUMN status TYPE monthlypaymentstatus
    USING status::monthlypaymentstatus;
ALTER TABLE monthly_payment_records ALTER COLUMN status SET DEFAULT 'paid'::monthlypaymentstatus;
```

---

## Migration 012 — `notification_logs`

**File:** `backend/alembic/versions/012_add_notification_logs.py`
**Revises:** `011`

### Purpose

Stores a log row for every automatic or manual monthly report send attempt, one row per channel (email / telegram) per send event. Used by the **Lịch Sử Báo Cáo** page.

### New Enum Types

| Type name | Values |
|---|---|
| `notificationchannel` | `'email'`, `'telegram'` |
| `notificationstatus` | `'success'`, `'failed'`, `'retrying'` |

### New Table: `notification_logs`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | NOT NULL | — | FK → `users.id` |
| `period_key` | `VARCHAR(7)` | NOT NULL | — | Format: `YYYY-MM` |
| `channel` | `notificationchannel` | NOT NULL | — | `'email'` or `'telegram'` |
| `status` | `notificationstatus` | NOT NULL | — | `'success'`, `'failed'`, `'retrying'` |
| `attempt_count` | `INTEGER` | NOT NULL | `1` | Incremented on retry |
| `error_message` | `TEXT` | NULL | — | Last error detail if failed |
| `sent_at` | `TIMESTAMPTZ` | NULL | — | Null if not yet successful |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Auto-set |

### Indexes

```sql
INDEX ix_notification_logs_user_id    ON (user_id)
INDEX ix_notification_logs_period_key ON (period_key)
INDEX ix_notification_logs_created_at ON (created_at)
```

> [!NOTE]
> Same two-step VARCHAR → enum cast approach as migration 011.

---

## How to Run

### Production (Docker Compose)

Migrations run **automatically** on every container startup via `entrypoint.sh`:

```bash
# Start the full stack — migrations run before uvicorn starts
docker compose -f docker-compose.yml -p prod_personalfinance up -d --build

```

To run migrations manually on a running container:

```bash
docker compose exec backend alembic upgrade head
```

### Development (local uvicorn)

```bash
cd backend
alembic upgrade head
```

### Verify Current State

```bash
# Check which revision is applied
docker compose exec backend alembic current

# View full history
docker compose exec backend alembic history --verbose

# Confirm tables exist in DB
docker compose exec postgres psql -U financeapp -d finance_db \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"

# Confirm enum types exist
docker compose exec postgres psql -U financeapp -d finance_db \
  -c "SELECT typname FROM pg_type WHERE typtype='e' ORDER BY typname;"
```

Expected output after applying both migrations:

```
 version_num
 012         ← HEAD
```

```
 table_name
 monthly_payment_records   ← NEW
 notification_logs          ← NEW
 (+ existing tables)
```

```
 typname
 monthlypaymentsourcetype   ← NEW
 monthlypaymentstatus        ← NEW
 notificationchannel         ← NEW
 notificationstatus          ← NEW
 (+ existing types)
```

---

## How to Roll Back

> [!CAUTION]
> Rolling back drops the tables and all data in them. Only do this in development or before the feature goes live.

```bash
# Roll back migration 012 only
docker compose exec backend alembic downgrade 011

# Roll back both 012 and 011
docker compose exec backend alembic downgrade 93b2653e2316

# Roll back to base (ALL migrations — destroys everything)
docker compose exec backend alembic downgrade base
```

Each downgrade:
- `012` downgrade: drops `notification_logs`, drops enum types `notificationchannel`, `notificationstatus`
- `011` downgrade: drops `monthly_payment_records`, drops enum types `monthlypaymentsourcetype`, `monthlypaymentstatus`

---

## Troubleshooting

### `DuplicateObjectError: type "..." already exists`

This happens if a previous migration attempt crashed after `CREATE TYPE` but before the transaction could be rolled back (asyncpg transactional DDL edge case).

**Fix:**

```bash
# Connect to the database
docker compose exec postgres psql -U financeapp -d finance_db

# Drop the orphaned types
DROP TYPE IF EXISTS monthlypaymentsourcetype CASCADE;
DROP TYPE IF EXISTS monthlypaymentstatus CASCADE;
DROP TYPE IF EXISTS notificationchannel CASCADE;
DROP TYPE IF EXISTS notificationstatus CASCADE;

# Also drop orphaned tables if they exist
DROP TABLE IF EXISTS monthly_payment_records CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;

\q

# Restart backend — migrations re-run cleanly
docker compose restart backend
```

### `DatatypeMismatchError: default for column "status" cannot be cast`

This is handled by the migration itself (DROP DEFAULT → ALTER TYPE → SET DEFAULT). If you see this, you may be on an older version of the migration file. Pull the latest and rebuild.

### Migration stuck / backend keeps restarting

```bash
# Check logs
docker compose logs backend --tail=30

# Check alembic_version to know where it stopped
docker compose exec postgres psql -U financeapp -d finance_db -c "SELECT * FROM alembic_version;"
```

---

## Related Files

| File | Role |
|---|---|
| `backend/alembic/versions/011_add_monthly_payment_records.py` | Migration script |
| `backend/alembic/versions/012_add_notification_logs.py` | Migration script |
| `backend/app/models/monthly_payment_record.py` | SQLAlchemy model |
| `backend/app/models/notification_log.py` | SQLAlchemy model |
| `backend/app/schemas/monthly_overview.py` | Pydantic schemas |
| `backend/app/schemas/notification_log.py` | Pydantic schemas |
| `backend/app/services/monthly_overview_service.py` | Business logic |
| `backend/app/services/notification_service.py` | Send logic |
| `backend/app/api/v1/monthly_overview.py` | API endpoints |
| `backend/app/api/v1/notifications.py` | API endpoints |
