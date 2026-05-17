# backend-new-requirement2.md — AI Agent Guide: Personal Loan Feature (Backend)

## Overview
This document extends the existing backend with a new debt subtype: **personal lump-sum loans** (`personal_lump_sum`). These are informal loans from friends/family, repaid all at once at a specific milestone — not monthly installments.

Key behavioral differences from existing monthly debts:
- NOT included in `total_debt_payment` on Dashboard
- NOT auto-added to Monthly Overview tab
- Visible across all months while `is_fully_paid = false`
- When repaid → treated as an expense (chi phí), not as debt repayment in monthly totals
- Can be manually added to Monthly Overview by user via batch selection popup

---

## Database Changes

### Modified Table: `debts`

Add the following columns via a new Alembic migration (`add_personal_loan_fields_to_debts`):

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `debt_category` | ENUM(`monthly_installment`, `personal_lump_sum`) | NOT NULL | `monthly_installment` | Discriminator — separates two debt subtypes |
| `repay_amount` | NUMERIC(15, 2) | YES | NULL | Agreed repayment amount (may differ from principal) |
| `borrow_date` | DATE | YES | NULL | Date money was borrowed |
| `repay_date` | DATE | YES | NULL | Planned/agreed repayment date |
| `lender_name` | VARCHAR(255) | YES | NULL | Name of person/entity who lent the money |
| `is_fully_paid` | BOOLEAN | NOT NULL | FALSE | True when the entire loan has been repaid |
| `actual_repaid_date` | TIMESTAMP WITH TIME ZONE | YES | NULL | When the loan was actually fully repaid |

**No new table needed.** All existing columns on `debts` remain. For `personal_lump_sum` records, the following existing columns are irrelevant and should be nullable/ignored: `interest_rate`, `monthly_payment`, `due_day`, `remaining_amount`.

**Migration must be reversible** — `downgrade()` removes all 7 columns.

**Existing records:** migration sets `debt_category = 'monthly_installment'` for all existing rows.

---

## Updated API Endpoints

### Debts — existing endpoints updated

**`GET /api/v1/debts`**
Add optional query param:
- `?category=monthly_installment | personal_lump_sum | all` (default: `all`)

This allows the frontend to fetch each tab separately.

**`POST /api/v1/debts`** (create)
Accept new fields in request body:
- `debt_category` (required, default `monthly_installment`)
- `repay_amount` (required if `debt_category = personal_lump_sum`)
- `borrow_date` (required if `debt_category = personal_lump_sum`)
- `repay_date` (optional)
- `lender_name` (required if `debt_category = personal_lump_sum`)

Validation rules:
- If `debt_category = personal_lump_sum`: require `repay_amount`, `borrow_date`, `lender_name`
- If `debt_category = monthly_installment`: require existing fields (`monthly_payment`, `due_day`, etc.)

**`PUT /api/v1/debts/{id}`** (update)
Accept same new fields. Cannot change `debt_category` after creation.

---

### New Endpoints

**`POST /api/v1/debts/{id}/mark-fully-paid`**

Mark a `personal_lump_sum` debt as fully repaid.

- Validates: `debt_category = personal_lump_sum` and `is_fully_paid = false`
- Sets: `is_fully_paid = true`, `actual_repaid_date = now()`
- Returns: updated debt record
- Error 400: if debt is already fully paid
- Error 400: if debt is `monthly_installment` type (wrong endpoint)

**`POST /api/v1/debts/{id}/unmark-fully-paid`**

Revert full repayment (in case of user error).

- Sets: `is_fully_paid = false`, `actual_repaid_date = NULL`
- Returns: updated debt record

**`GET /api/v1/personal-loans/available?period=YYYY-MM`**

Returns all `personal_lump_sum` debts that:
1. Are active in the given period: `borrow_date <= period_end AND (repay_date IS NULL OR repay_date >= period_start)`
2. `is_fully_paid = false`
3. `deleted_at IS NULL`
4. `user_id = current_user.id`
5. NOT already present in `monthly_payment_records` for this `period_key` (so already-added ones are excluded from the popup list)

Returns list of personal loans + for each: whether it already exists in `monthly_payment_records` for this period (for UI to show state).

**`POST /api/v1/monthly-overview/add-personal-loans`**

Batch add selected personal loans to Monthly Overview and auto-mark as paid.

Request body:
```
{
  "period_key": "YYYY-MM",
  "debt_ids": ["uuid1", "uuid2", ...]
}
```

Logic (atomic transaction):
1. Validate all `debt_ids` belong to `current_user` and are `personal_lump_sum`
2. For each debt_id: UPSERT into `monthly_payment_records` with `source_type=debt`, `source_id=debt_id`, `period_key`, `status=paid`
3. Return list of created/updated `monthly_payment_records`

Error handling:
- 400: if any `debt_id` is not `personal_lump_sum` type
- 404: if any `debt_id` not found or not owned by user
- If any single upsert fails → rollback all (atomic)

---

## Business Logic Changes

### Dashboard — `GET /api/v1/dashboard/summary`

**`total_debt_payment`** calculation must EXCLUDE `personal_lump_sum` debts:
```
Only include in total_debt_payment:
  debts WHERE debt_category = 'monthly_installment' AND status = 'active'
```

`personal_lump_sum` debts never contribute to `total_debt_payment` or `net_cashflow` via the debt pathway. Their repayment is only reflected if the user manually adds them to Monthly Overview (treated as expense-like entry for that month's view).

### Monthly Overview — `GET /api/v1/monthly-overview`

**`personal_lump_sum` debts are EXCLUDED from the default overview list.**

The overview endpoint only returns:
- `monthly_installment` debts (active, within period)
- Expenses (all types, within period)
- Incomes (all types, within period)

Personal loans are fetched separately via `GET /api/v1/personal-loans/available?period=YYYY-MM` (for the popup), and only appear in the overview list if they have a `monthly_payment_records` entry for that period.

**Updated monthly overview query logic:**
After fetching the default items, additionally include any `personal_lump_sum` debts that have a `monthly_payment_records` entry for this period (with `status=paid` or `status=unpaid`). These appear in the "Nợ" section of the overview with an indicator that they are personal loans.

### Personal Loan Visibility Across Months (req 1.4)

For `GET /api/v1/personal-loans/available?period=YYYY-MM`, the period filter is:
```
borrow_date <= last_day_of_period
AND (repay_date IS NULL OR repay_date >= first_day_of_period)
AND is_fully_paid = false
```

This means a loan from 2026-01-01 to 2026-12-31 appears in every month of 2026 until `is_fully_paid = true`.

---

## Updated Schemas (Pydantic)

### `DebtResponse` — add fields:
- `debt_category`: `monthly_installment | personal_lump_sum`
- `repay_amount`: `str | None` (Decimal as string)
- `borrow_date`: `date | None`
- `repay_date`: `date | None`
- `lender_name`: `str | None`
- `is_fully_paid`: `bool`
- `actual_repaid_date`: `datetime | None`

### `CreateDebtRequest` — add same fields with validation:
- `debt_category`: required, default `monthly_installment`
- If `personal_lump_sum`: `repay_amount`, `borrow_date`, `lender_name` are required
- If `monthly_installment`: existing required fields unchanged

### New schema: `AddPersonalLoansToOverviewRequest`
```
period_key: str  (YYYY-MM format)
debt_ids: list[UUID]  (min length 1)
```

---

## Caching Updates

- Dashboard summary cache invalidation: already handled (any debt write invalidates dashboard cache)
- Monthly overview cache: invalidated when `add-personal-loans` batch endpoint is called
- New cache key: `personal_loans_available:{user_id}:{period_key}` → TTL 15 minutes — invalidate when any debt is updated or `mark-fully-paid` / `add-personal-loans` is called

---

## Error Codes (new)
- `DEBT_ALREADY_FULLY_PAID` — 400 when calling mark-fully-paid on already-paid loan
- `WRONG_DEBT_CATEGORY` — 400 when calling personal-loan endpoints on monthly_installment debt
- `BATCH_ADD_PARTIAL_FAILURE` — 500 if atomic batch fails (should not happen with proper transaction)
