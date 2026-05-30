# frontend-new-requirement2.md — AI Agent Guide: Personal Loan Feature (Frontend)

## Overview
This document extends the existing frontend with UI for **personal lump-sum loans** — a new debt subtype. Changes span the Debts page (new tab), the Monthly Overview page (new popup flow), and shared types/API client.

No new routes are needed. All changes are additive within existing pages.

---

## New TypeScript Types

Add to `src/types/debt.ts` (or create if not exists):

```typescript
type DebtCategory = 'monthly_installment' | 'personal_lump_sum'

// Extend existing Debt interface:
interface Debt {
  // ...existing fields...
  debt_category: DebtCategory
  repay_amount: string | null        // Decimal string
  borrow_date: string | null         // ISO date
  repay_date: string | null          // ISO date
  lender_name: string | null
  is_fully_paid: boolean
  actual_repaid_date: string | null
}
```

Add to `src/types/monthlyOverview.ts`:
```typescript
// Extend OverviewItem:
interface OverviewItem {
  // ...existing fields...
  debt_category?: DebtCategory       // present when source_type = 'debt'
  is_fully_paid?: boolean            // present for personal_lump_sum items in overview
  lender_name?: string | null
}

interface PersonalLoanAvailable {
  id: string
  name: string                       // loan label
  lender_name: string
  principal_amount: string           // borrowed
  repay_amount: string               // to repay
  borrow_date: string
  repay_date: string | null
  already_in_overview: boolean       // already has monthly_payment_record this period
}

interface AddPersonalLoansPayload {
  period_key: string
  debt_ids: string[]
}
```

---

## New API Client Functions

Add to `src/api/debts.ts`:
```typescript
// Fetch debts filtered by category
getDebts(category?: 'monthly_installment' | 'personal_lump_sum' | 'all')

// Mark personal loan as fully repaid
markFullyPaid(debtId: string)

// Revert full repayment
unmarkFullyPaid(debtId: string)
```

Add to `src/api/monthlyOverview.ts`:
```typescript
// Get personal loans available for a period (for popup)
getPersonalLoansAvailable(period: string): Promise<PersonalLoanAvailable[]>

// Batch add personal loans to monthly overview + auto-mark paid
addPersonalLoansToOverview(payload: AddPersonalLoansPayload): Promise<PaymentRecord[]>
```

---

## Debts Page — Changes

### Tab Structure

The existing Debts page gains a **two-tab layout** inside the page:

```
┌──────────────────────────────────────────┐
│  Khoản Nợ                [+ Thêm Khoản Nợ]│
├──────────────────────────────────────────┤
│  [Trả Hàng Tháng]  [Vay Cá Nhân]         │  ← NEW tab switcher
├──────────────────────────────────────────┤
│  <tab content>                            │
└──────────────────────────────────────────┘
```

**Tab 1: "Trả Hàng Tháng"** — existing debt list, unchanged. Fetches `GET /api/v1/debts?category=monthly_installment`.

**Tab 2: "Vay Cá Nhân"** — new personal loan list. Fetches `GET /api/v1/debts?category=personal_lump_sum`.

The "+ Thêm Khoản Nợ" button opens a drawer. The drawer form adapts based on which tab is active (see form section below).

### React Query Keys

```typescript
['debts', 'monthly_installment']   // Tab 1
['debts', 'personal_lump_sum']     // Tab 2
```

Invalidate both when a debt is created/updated/deleted (invalidate `['debts']` prefix).

---

## Personal Loan List (Tab 2)

### List Layout

Each personal loan is a card (not a table row — more readable for varied data):

```
┌─────────────────────────────────────────────────────┐
│  👤 Người thân (Anh Hai)              10,000,000 ₫  │
│     Trả: 10,500,000 ₫   Mượn: 01/01/2026            │
│     Hạn trả: 31/12/2026              [BADGE: Chưa trả]│
│                                   [Sửa] [Đã Trả Hết]│
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  👤 Bạn Minh                           5,000,000 ₫  │
│     Trả: 5,000,000 ₫    Mượn: 15/03/2026            │
│     Hạn trả: Không xác định          [BADGE: Chưa trả]│
│                                   [Sửa] [Đã Trả Hết]│
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐  ← Paid state
│  👤 Chị Ba                             2,000,000 ₫  │
│     Trả: 2,000,000 ₫    Mượn: 10/01/2026            │
│     Đã trả: 20/02/2026               [BADGE: ✅ Xong]│
│     (card muted/dimmed)               [Sửa] [Hoàn Tác]│
└─────────────────────────────────────────────────────┘
```

**Status badges:**
- Unpaid + repay_date in future or null: gray `"Chưa trả"`
- Unpaid + repay_date passed: red `"⚠ Quá hạn"`
- `is_fully_paid = true`: green `"✅ Xong"`

**"Đã Trả Hết" button:**
- Calls `POST /api/v1/debts/{id}/mark-fully-paid`
- Show confirmation dialog before calling: "Xác nhận đã trả hết khoản vay này?"
- On success: card updates to paid state (dimmed), button changes to "Hoàn Tác"
- "Hoàn Tác" → calls `unmark-fully-paid`

**Filter bar above list:**
- Toggle: `[Chưa trả] [Đã trả] [Tất cả]` — client-side filter on fetched data
- Default: "Chưa trả" (most relevant view)

**Empty state:**
- Unpaid filter: "Không có khoản vay cá nhân nào chưa thanh toán."
- All filter: "Chưa có khoản vay cá nhân nào. Nhấn + để thêm."

---

## Add/Edit Drawer — Debt Form Updates

The existing debt drawer form needs to adapt based on `debt_category`.

### Category Selector (shown at top of form, before other fields)

Radio or Segmented control:
```
Loại khoản nợ:
  ○ Trả hàng tháng   ● Vay cá nhân
```

- Default: whichever tab is currently active when opening the drawer
- Cannot be changed after creation (disable the selector in edit mode)

### Conditional Fields

**When `debt_category = monthly_installment`:** Show existing form fields unchanged (no change to this path).

**When `debt_category = personal_lump_sum`:** Show ONLY these fields:

| Field | Label | Type | Required |
|---|---|---|---|
| `name` | Tên khoản vay | text | ✅ |
| `lender_name` | Người cho mượn | text | ✅ |
| `principal_amount` | Số tiền mượn (₫) | currency input | ✅ |
| `repay_amount` | Số tiền phải trả (₫) | currency input | ✅ |
| `borrow_date` | Ngày mượn | date | ✅ |
| `repay_date` | Ngày trả dự kiến | date | ❌ optional |
| `notes` | Ghi chú | textarea | ❌ optional |

Hide entirely for personal loan: `interest_rate`, `monthly_payment`, `due_day`, `start_date`, `end_date`, `status`.

**Zod validation (personal_lump_sum path):**
- `repay_amount >= principal_amount` is NOT enforced (can repay less) — just require positive number
- `repay_date` if provided must be `>= borrow_date`

---

## Monthly Overview Page — Changes

### New Button: "Thêm Nợ Cá Nhân"

Add a button in the Monthly Overview page, positioned in the action row (alongside the existing "Xuất Excel" button):

```
┌─────────────────────────────────────────────────────┐
│  ✅ 5/8 đã xử lý    [+ Nợ Cá Nhân]  [Xuất Excel ↓] │
└─────────────────────────────────────────────────────┘
```

Button label: `"+ Nợ Cá Nhân"`
- Only shows if there are any `personal_lump_sum` debts available for the period (check via `GET /api/v1/personal-loans/available?period=YYYY-MM` result count)
- If no personal loans available for the period → hide the button entirely (or show disabled with tooltip "Không có khoản vay cá nhân nào trong tháng này")

### Personal Loan Selection Popup (Dialog/Sheet)

Opens when user clicks "+ Nợ Cá Nhân".

```
┌──────────────────────────────────────────────┐
│  Thêm Khoản Nợ Cá Nhân vào Tháng 04/2025     │  ← Dialog title
│  Chọn khoản vay muốn theo dõi trong tháng này│
├──────────────────────────────────────────────┤
│  ☐  Người thân (Anh Hai)      10,000,000 ₫   │
│     Mượn: 01/01/2026 · Hạn: 31/12/2026       │
├──────────────────────────────────────────────┤
│  ☐  Bạn Minh                   5,000,000 ₫   │
│     Mượn: 15/03/2026 · Không có hạn          │
├──────────────────────────────────────────────┤
│  ☑  Chị Ba (already added)     2,000,000 ₫   │  ← already_in_overview=true
│     (disabled checkbox, shows "Đã thêm" badge)│
├──────────────────────────────────────────────┤
│                  [Huỷ]  [Add to mark đã trả] │
└──────────────────────────────────────────────┘
```

**Behavior:**
- Opens loading state while fetching `GET /api/v1/personal-loans/available?period=YYYY-MM`
- Default: all checkboxes unchecked (even if multiple loans exist — user must actively choose)
- `already_in_overview = true` items: show with disabled checkbox + "Đã thêm" badge — user cannot re-add
- "Add to mark đã trả" button: disabled until at least 1 checkbox is checked
- Button label updates with count: `"Add {n} khoản vào tháng này"`

**On submit:**
1. Button shows spinner: "Đang thêm..."
2. Call `POST /api/v1/monthly-overview/add-personal-loans` with selected `debt_ids`
3. On success:
   - Close dialog
   - Toast: "Đã thêm {n} khoản nợ cá nhân và đánh dấu đã trả"
   - Invalidate `['monthly-overview', period]` → overview list refetches and shows the newly added loans (with `is_paid = true`)
   - Invalidate `['personal-loans-available', period]` → button/popup reflects updated state
4. On error: toast error, keep dialog open

### Personal Loan Items in Overview List

Personal lump-sum loans that have been added to the overview appear in the "NỢ PHẢI TRẢ" section with a distinguishing visual:

```
┌────────────────────────────────────────────────────────┐
│ 👤  Người thân (Anh Hai)       10,500,000 ₫  Vay CN   │
│     Anh Hai · Mượn: 01/01/2026          [✓ Đã Trả]    │
└────────────────────────────────────────────────────────┘
```

- Badge: `"Vay CN"` (small pill badge, different color from regular debt — e.g., purple vs orange)
- Shows `lender_name` as subtitle
- Mark button still works (can unmark if needed)
- Amount shown is `repay_amount` (what they owe to repay), not `principal_amount`

---

## React Query Keys (new)

```typescript
['personal-loans-available', period]    // for popup list, TTL short
['debts', 'personal_lump_sum']          // Tab 2 list
['debts', 'monthly_installment']        // Tab 1 list (existing, now explicit)
```

**Invalidation rules:**
- Any debt create/update/delete → invalidate `['debts']` (all debt queries)
- `mark-fully-paid` / `unmark-fully-paid` → invalidate `['debts', 'personal_lump_sum']` + `['personal-loans-available']`
- `add-personal-loans` batch → invalidate `['monthly-overview', period]` + `['personal-loans-available', period]`

---

## UX Notes

- The two debt tabs use the same "+ Thêm Khoản Nợ" button — the form auto-selects category based on active tab. Make this clear with a subtle label in the drawer header: e.g., "Thêm Khoản Nợ · Vay Cá Nhân"
- The personal loan cards use a card layout (not table rows) because the data shape is very different from monthly debts — avoid forcing them into the same table columns
- Overdue personal loans (`repay_date < today` and `is_fully_paid = false`) show the red "⚠ Quá hạn" badge — this should be eye-catching but not alarming; use `orange-500` rather than `red-500`
- When the overview list includes personal loan items, include a small legend or note below the list: "👤 Vay CN = Khoản vay cá nhân (trả 1 lần)" so users understand the badge
