# frontend-new-requirement.md — AI Agent Guide: New Feature Frontend

## Overview
This document extends `frontend.md` with new UI requirements:
1. **Monthly Overview Tab** — unified list of all debts/expenses/incomes for selected month
2. **Mark as Paid** — inline buttons per item to toggle payment status
3. **Excel Export** — button to download month data as Excel
4. **Notification History Page** — view history of auto-sent monthly reports

All components follow existing design language: Tailwind CSS + shadcn/ui, same MonthPicker/CurrencyDisplay conventions.

---

## New Route

```
/app/overview    → MonthlyOverviewPage   [AppLayout, protected]
```

Add to Sidebar Navigation:
```
🏠 Dashboard         /app/dashboard
📋 Tổng Quan Tháng   /app/overview       ← NEW (place after Dashboard)
💳 Nợ               /app/debts
💸 Chi Tiêu          /app/expenses
💰 Thu Nhập          /app/incomes
🤖 Phân Tích AI      /app/ai
🔔 Lịch Sử Báo Cáo  /app/notifications  ← NEW (place at bottom)
```

---

## New Files

```
src/
├── api/
│   ├── monthlyOverview.ts        ← NEW
│   └── notifications.ts          ← NEW
├── components/
│   ├── overview/
│   │   ├── OverviewFilters.tsx   ← type filter tabs
│   │   ├── OverviewSummaryBar.tsx← summary totals strip
│   │   ├── OverviewItemRow.tsx   ← single item row component
│   │   └── ExportButton.tsx      ← Excel export button
│   └── notifications/
│       └── NotificationLogList.tsx
├── pages/
│   └── app/
│       ├── MonthlyOverviewPage.tsx  ← NEW
│       └── NotificationsPage.tsx    ← NEW
└── types/
    ├── monthlyOverview.ts        ← NEW
    └── notification.ts           ← NEW
```

---

## Monthly Overview Page (`/app/overview`)

### Page Layout (top to bottom)

```
┌─────────────────────────────────────────────┐
│  Tổng Quan Tháng         [◀ Apr 2025 ▶]     │  ← Page header + MonthPicker
├─────────────────────────────────────────────┤
│  Thu: 15M ₫  Chi: 3M ₫  Nợ: 2M ₫  Ròng: +10M│  ← Summary Bar
├─────────────────────────────────────────────┤
│  [Tất cả] [Nợ] [Chi tiêu] [Thu nhập]        │  ← Type Filter Tabs
├─────────────────────────────────────────────┤
│  ✅ 5/8 đã xử lý        [Xuất Excel ↓]      │  ← Status count + Export button
├─────────────────────────────────────────────┤
│  ITEM LIST (see below)                       │
└─────────────────────────────────────────────┘
```

### Summary Bar (`OverviewSummaryBar`)
Horizontal strip of 4 stat chips:
- 💰 Tổng Thu: `{total_income}` (green)
- 💸 Tổng Chi: `{total_expense}` (red)
- 💳 Tổng Nợ: `{total_debt_payment}` (orange)
- 📊 Dòng Tiền Ròng: `{net_cashflow}` (green if positive, red if negative, bold)

Skeleton loading state while fetching.

### Type Filter Tabs (`OverviewFilters`)
Tab pills: **Tất Cả** | **Nợ** | **Chi Tiêu** | **Thu Nhập**

- Controls `?type=all|debt|expense|income` query param to backend
- OR: frontend-side filter on already-fetched data (prefer this to avoid re-fetch)
- Active tab has filled background, inactive tabs are outlined
- Each tab shows item count badge: e.g., "Nợ (3)"

### Status Counter + Export Row
Left side: `"{paid_count}/{total_count} đã xử lý"` — updates reactively as user marks items
Right side: `[⬇ Xuất Excel]` button — see ExportButton section below

### Item List

Groups items under section headers:

```
── NỢ PHẢI TRẢ ─────────────────────
  [item row]
  [item row]

── CHI TIÊU ─────────────────────────
  [item row]
  [item row]

── THU NHẬP ─────────────────────────
  [item row]
  [item row]
```

Section headers only shown when `type = all`. Hidden when filtering by specific type.

---

## Item Row Component (`OverviewItemRow`)

### Debt Row
```
┌────────────────────────────────────────────────────────────┐
│ 💳  VPBank Credit Card          1,500,000 ₫   Đến hạn: 15  │
│     Còn lại: 45,000,000 ₫ · Tín dụng     [✓ Đã Trả] hoặc  │
│                                            [Mark Đã Trả]    │
└────────────────────────────────────────────────────────────┘
```

### Expense Row
```
┌────────────────────────────────────────────────────────────┐
│ 📅  YouTube Premium              79,000 ₫   Hàng tháng     │
│     Subscription                            [✓ Đã Chi] hoặc│
│                                             [Mark Đã Chi]   │
└────────────────────────────────────────────────────────────┘
```

### Income Row (no mark button — income doesn't need marking)
```
┌────────────────────────────────────────────────────────────┐
│ 💰  Lương Công ty A          15,000,000 ₫   Hàng tháng     │
│     Salary                                                  │
└────────────────────────────────────────────────────────────┘
```

### Mark Button States

**Unpaid state:**
- Outlined button, gray text: `"Mark Đã Trả"` (for debt) / `"Mark Đã Chi"` (for expense)
- Icon: circle outline

**Paid state:**
- Filled button, green: `"✓ Đã Trả"` / `"✓ Đã Chi"`
- Icon: checkmark circle filled
- Clicking switches back to unpaid (toggle behavior)

**Loading state (during API call):**
- Button shows spinner, disabled
- Row opacity: 0.7

### Mark Button Interaction Flow
1. User clicks "Mark Đã Trả" on a debt row
2. Button immediately goes to loading state (optimistic feedback)
3. Call `POST /api/v1/monthly-overview/mark-paid`
4. On success:
   - Button switches to "✓ Đã Trả" (green, filled)
   - `paid_count` in status counter increments
   - React Query cache updated (optimistic update pattern)
5. On error:
   - Button reverts to original state
   - Error toast: "Không thể cập nhật trạng thái. Thử lại."
6. Click "✓ Đã Trả" again → calls `mark-unpaid`, reverts to unpaid state

---

## Excel Export Button (`ExportButton`)

Button: `⬇ Xuất Excel` — secondary outlined button, positioned top-right of list

**Click behavior:**
1. Button shows loading spinner: `"Đang tạo file..."`
2. Call `GET /api/v1/monthly-overview/export/excel?period=YYYY-MM`
   - This returns a binary file stream
3. Use browser download trick: create a temporary `<a>` tag with `href=blob URL`, click it programmatically, then revoke the blob URL
4. File downloads as `finance_YYYY-MM.xlsx`
5. Button returns to normal state
6. On error: toast "Xuất file thất bại"

**Important:** The export call must include the `Authorization: Bearer` header. Use Axios with `responseType: 'blob'` for this request specifically, not the default JSON response type.

---

## Notification History Page (`/app/notifications`)

Accessible from sidebar at bottom. Shows history of auto-sent monthly reports.

### Page Layout
```
┌─────────────────────────────────────────────┐
│  Lịch Sử Báo Cáo Tự Động                    │
│  Các báo cáo tháng đã được gửi tự động       │
├─────────────────────────────────────────────┤
│  [Gửi Báo Cáo Thủ Công ▼]                   │  ← manual trigger button
├─────────────────────────────────────────────┤
│  NOTIFICATION LOG LIST                       │
└─────────────────────────────────────────────┘
```

### Notification Log List (`NotificationLogList`)

Each log entry is a card or table row:

```
┌──────────────────────────────────────────────┐
│  📧 Email · Tháng 04/2025          ✅ Thành công │
│  Gửi lúc: 30/04/2025 22:00:14                 │
├──────────────────────────────────────────────┤
│  ✈ Telegram · Tháng 04/2025       ✅ Thành công │
│  Gửi lúc: 30/04/2025 22:00:17                 │
├──────────────────────────────────────────────┤
│  📧 Email · Tháng 03/2025          ❌ Thất bại  │
│  Lỗi: SMTP connection timeout                 │
└──────────────────────────────────────────────┘
```

Status badges: green "Thành công" / red "Thất bại" / yellow "Đang thử lại"
Channel icons: 📧 for email, Telegram logo icon for telegram (use Lucide `Send` as fallback)

### Manual Send Button
Dropdown button "Gửi Báo Cáo Thủ Công" → popover with MonthPicker → confirm → call `POST /api/v1/notifications/send-now?period=YYYY-MM`

Shows loading state. On completion → refresh notification log list.

---

## API Client Functions (new)

### `src/api/monthlyOverview.ts`
```typescript
// Fetch monthly overview list
getMonthlyOverview(period: string, type?: 'all'|'debt'|'expense'|'income')
  → Promise<MonthlyOverviewResponse>

// Mark item as paid
markAsPaid(payload: MarkPaymentPayload) → Promise<PaymentRecord>

// Mark item as unpaid
markAsUnpaid(payload: MarkPaymentPayload) → Promise<PaymentRecord>

// Export Excel — IMPORTANT: use responseType: 'blob'
exportExcel(period: string) → Promise<Blob>
```

### `src/api/notifications.ts`
```typescript
getNotificationHistory(limit?: number) → Promise<NotificationLog[]>
sendReportNow(period: string) → Promise<{ status: string }>
```

---

## TypeScript Types (new)

### `src/types/monthlyOverview.ts`
```typescript
type SourceType = 'debt' | 'expense' | 'income'

interface OverviewItem {
  id: string
  source_type: SourceType
  name: string
  amount: string          // Decimal as string from backend
  frequency: string
  category: string

  // Debt-specific
  due_day?: number
  remaining_amount?: string

  // Debt + Expense only
  is_paid?: boolean
  payment_record_id?: string | null
  marked_at?: string | null
}

interface MonthlyOverviewResponse {
  period: string
  summary: {
    total_income: string
    total_expense: string
    total_debt_payment: string
    net_cashflow: string
    paid_count: number
    unpaid_count: number
  }
  items: OverviewItem[]
}

interface MarkPaymentPayload {
  source_type: 'debt' | 'expense'
  source_id: string
  period_key: string
  note?: string
}
```

### `src/types/notification.ts`
```typescript
type NotificationChannel = 'email' | 'telegram'
type NotificationStatus = 'success' | 'failed' | 'retrying'

interface NotificationLog {
  id: string
  period_key: string
  channel: NotificationChannel
  status: NotificationStatus
  attempt_count: number
  error_message: string | null
  sent_at: string | null
  created_at: string
}
```

---

## React Query Keys (new)

```typescript
['monthly-overview', period, type]         // overview list
['notifications', 'history']               // notification logs
```

**Cache invalidation:**
- After `markAsPaid` or `markAsUnpaid`: invalidate `['monthly-overview', period]` and `['dashboard', 'summary', period]`
- After `sendReportNow`: invalidate `['notifications', 'history']`

**Optimistic update pattern for mark buttons:**
Use `useMutation` with `onMutate` → `onError` rollback → `onSettled` refetch. This makes the UI feel instant even before the API returns.

---

## UX Notes

### Mobile Behavior
- Item rows stack vertically, mark button below the item details
- Export button is full-width on mobile
- Summary bar scrolls horizontally on small screens

### Empty States
- No items for selected month: "Không có dữ liệu cho tháng này. Hãy thêm khoản thu chi trong các tab tương ứng."
- No notification history: "Chưa có báo cáo nào được gửi. Báo cáo sẽ tự động gửi vào cuối mỗi tháng."

### Loading Skeletons
- Overview list: show 5 skeleton rows while loading
- Summary bar: show 4 skeleton chips

### Mark Button Text by Type
| source_type | Unpaid label | Paid label |
|---|---|---|
| `debt` | "Mark Đã Trả" | "✓ Đã Trả" |
| `expense` | "Mark Đã Chi" | "✓ Đã Chi" |
