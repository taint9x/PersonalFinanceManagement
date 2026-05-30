# combine2.md — Personal Loan Feature: Project Assembly Guide

## Overview
This document covers all project-level changes for the personal lump-sum loan feature. Changes are minimal and additive — no new services, no new Docker containers, no structural changes to existing infrastructure.

---

## Scope of Changes

| Layer | Change Type | Detail |
|---|---|---|
| Database | Migration only | Add 7 columns to existing `debts` table |
| Backend | Additive | New endpoints, updated schemas, updated query logic |
| Frontend | Additive | New tab, new drawer form path, new popup in overview |
| Docker / Infra | **None** | No changes required |
| Environment variables | **None** | No new env vars required |
| Documents | Update only | Update existing schema doc, add no new setup guides |

---

## Database Migration

### New migration file: `add_personal_loan_fields_to_debts`

This is the only DB change. Run order after existing migrations:

```
1. (existing) initial tables
2. (existing) add user_id columns
3. (existing) add_monthly_payment_records_table
4. (existing) add_notification_logs_table
5. (NEW) add_personal_loan_fields_to_debts        ← this feature
```

**Migration must:**
- Add all 7 new columns (see `backend-new-requirement2.md` → Database Changes)
- Set `debt_category = 'monthly_installment'` for ALL existing rows as part of the migration (backfill)
- Create the ENUM type `debt_category_enum` before adding the column (PostgreSQL requires this)
- `downgrade()` removes all 7 columns and drops the ENUM type

**No seed data changes needed.**

---

## Files to Modify (Existing)

### Backend

| File | Change |
|---|---|
| `app/models/debt.py` | Add 7 new columns, add `debt_category` ENUM type |
| `app/schemas/debt.py` | Update `DebtResponse`, `CreateDebtRequest`, `UpdateDebtRequest` |
| `app/api/v1/debts.py` | Add `?category` query param to list endpoint; add `mark-fully-paid` and `unmark-fully-paid` routes |
| `app/api/v1/monthly_overview.py` | Update overview query to exclude `personal_lump_sum` by default; add `add-personal-loans` batch route |
| `app/services/monthly_overview_service.py` | Update period filter logic to skip `personal_lump_sum`; add logic to include them if in `monthly_payment_records` |
| `app/api/v1/__init__.py` or `app/main.py` | Register new route `/api/v1/personal-loans/available` |

Add new file:
| File | Purpose |
|---|---|
| `app/api/v1/personal_loans.py` | `GET /api/v1/personal-loans/available?period=YYYY-MM` endpoint |

### Frontend

| File | Change |
|---|---|
| `src/types/debt.ts` | Extend `Debt` interface with 7 new fields |
| `src/types/monthlyOverview.ts` | Extend `OverviewItem`; add `PersonalLoanAvailable`, `AddPersonalLoansPayload` |
| `src/api/debts.ts` | Add `getDebts(category?)`, `markFullyPaid()`, `unmarkFullyPaid()` |
| `src/api/monthlyOverview.ts` | Add `getPersonalLoansAvailable()`, `addPersonalLoansToOverview()` |
| `src/pages/app/DebtsPage.tsx` | Add two-tab layout, render `PersonalLoanList` in Tab 2 |
| `src/pages/app/MonthlyOverviewPage.tsx` | Add "+ Nợ Cá Nhân" button and popup trigger |
| `src/components/debts/DebtForm.tsx` (or equivalent) | Add category selector, conditional field rendering |

Add new files:
| File | Purpose |
|---|---|
| `src/components/debts/PersonalLoanCard.tsx` | Card component for a single personal loan |
| `src/components/debts/PersonalLoanList.tsx` | List + filter bar for Tab 2 |
| `src/components/overview/PersonalLoanPopup.tsx` | Dialog with checkbox selection + batch add |

---

## Dashboard — Behavior Clarification

The Dashboard `total_debt_payment` calculation must be verified to exclude `personal_lump_sum` records after migration. Since existing debts all have `debt_category = monthly_installment` (backfilled), this change only affects future personal loan records. No dashboard UI changes needed.

Verify in `app/services/monthly_overview_service.py` (or wherever `total_debt_payment` is computed): the debt query must filter `WHERE debt_category = 'monthly_installment'`.

---

## Excel Export — Update

The existing Excel export (`GET /api/v1/monthly-overview/export/excel`) should reflect the updated overview data:

- **Sheet 2 (Nợ):** If personal loan items are present in the overview (user added them via popup), include them in this sheet with an extra column "Loại" showing "Vay cá nhân" vs "Trả hàng tháng"
- No structural changes to the export endpoint — it already uses the overview service, which will now correctly include personal loans if they exist in `monthly_payment_records`

---

## Documents to Update

### `documents/DATABASE_SCHEMA.md`
Update the `debts` table section to document all 7 new columns with types, nullability, and purpose. Add a note explaining the `debt_category` discriminator pattern.

### `documents/API_REFERENCE.md`
Add documentation for:
- Updated `GET /api/v1/debts` — new `?category` query param
- `POST /api/v1/debts/{id}/mark-fully-paid`
- `POST /api/v1/debts/{id}/unmark-fully-paid`
- `GET /api/v1/personal-loans/available?period=YYYY-MM`
- `POST /api/v1/monthly-overview/add-personal-loans`

### `documents/README.md`
Add to feature list under Khoản Nợ section:
- "Vay cá nhân (trả 1 lần): theo dõi khoản vay bạn bè/người thân, không tính vào tổng trả nợ hàng tháng"

No new human setup guides needed — this feature requires zero external configuration.

---

## Testing Checklist

### Database
- [ ] Migration runs cleanly on existing DB with existing debt records
- [ ] All existing debts have `debt_category = 'monthly_installment'` after migration
- [ ] Downgrade migration removes all new columns without error

### Backend
- [ ] `GET /api/v1/debts?category=monthly_installment` returns only existing debts
- [ ] `GET /api/v1/debts?category=personal_lump_sum` returns only new personal loans
- [ ] `GET /api/v1/debts` (no param) returns all types
- [ ] Create personal loan → validates required fields (`repay_amount`, `borrow_date`, `lender_name`)
- [ ] Create personal loan → does NOT appear in `GET /api/v1/dashboard/summary` `total_debt_payment`
- [ ] Create personal loan → does NOT appear in `GET /api/v1/monthly-overview` default list
- [ ] `GET /api/v1/personal-loans/available?period=2026-04` returns loan with `borrow_date=2026-01-01, repay_date=2026-12-31`
- [ ] Same loan NOT returned if `is_fully_paid = true`
- [ ] Same loan NOT returned if already in `monthly_payment_records` for that period
- [ ] `POST /api/v1/monthly-overview/add-personal-loans` — batch adds + auto-marks paid
- [ ] After batch add, loan appears in `GET /api/v1/monthly-overview` with `is_paid=true`
- [ ] `mark-fully-paid` → `is_fully_paid=true`, `actual_repaid_date` set
- [ ] `mark-fully-paid` on already-paid loan → 400 error
- [ ] `mark-fully-paid` on `monthly_installment` debt → 400 error

### Frontend
- [ ] Debts page shows two tabs; Tab 1 shows existing debts; Tab 2 shows personal loans
- [ ] "+ Thêm Khoản Nợ" from Tab 1 → form pre-selects "Trả hàng tháng"
- [ ] "+ Thêm Khoản Nợ" from Tab 2 → form pre-selects "Vay cá nhân"
- [ ] Switching category selector changes visible form fields
- [ ] Personal loan card shows overdue badge when `repay_date` is past and `is_fully_paid=false`
- [ ] "Đã Trả Hết" → confirmation dialog → marks paid → card dims and button becomes "Hoàn Tác"
- [ ] Monthly Overview: "+ Nợ Cá Nhân" button hidden when no loans available for period
- [ ] Popup opens, shows loans with unchecked checkboxes by default
- [ ] Already-added loans show disabled checkbox + "Đã thêm" badge
- [ ] Selecting loans enables "Add {n} khoản" button
- [ ] Submit → loans appear in overview list with "Vay CN" badge and `is_paid = true`
- [ ] Overview list legend shown when personal loan items present
- [ ] Excel export sheet 2 includes personal loan items with "Loại" column
