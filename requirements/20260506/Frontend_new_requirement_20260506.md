# frontend-new-requirement_20260506.md
# UI Enhancement: Grouped List View + Calendar View

## Overview
Two UI-only enhancements across Expenses, Incomes, and Monthly Overview tabs.
**No backend changes. No new API calls. All logic derived from existing cached data.**

---

## Requirement 1 — Grouped List View for One-Time Records

### Scope
- `ExpensesPage` → "Một Lần" tab
- `IncomesPage` → "Một Lần" tab
- `MonthlyOverviewPage` → one-time items within the list

### Behavior
One-time records are grouped by `transaction_date` (date only, not time).
Each group has a header row showing the date and a collapse/expand toggle.
Recurring records (monthly/weekly/yearly) are NOT grouped — they remain as a flat list in their existing section.

### Group Header Layout
```
┌──────────────────────────────────────────────┐
│  ▼  Thứ Năm, 01/05/2026          3 khoản     │  ← collapsed: ►
│     ─────────────────────────────────────────│
│     [item row]                               │
│     [item row]                               │
│     [item row]                               │
├──────────────────────────────────────────────┤
│  ▼  Thứ Sáu, 02/05/2026          1 khoản     │
│     [item row]                               │
├──────────────────────────────────────────────┤
│  ▼  Thứ Bảy, 03/05/2026          1 khoản     │
│     [item row]                               │
└──────────────────────────────────────────────┘
```

**Group header content:**
- Left: chevron icon (▼ expanded / ► collapsed) + Vietnamese day name + date formatted as `dd/MM/yyyy`
- Right: count badge `"{n} khoản"`
- Full-width clickable to toggle

**Default state:** All groups expanded on initial load.

**Sort order:** Groups sorted by date descending (most recent first) within the selected month.

### Implementation Notes

**Grouping logic (pure frontend computation):**
```
1. Filter items where frequency = 'one_time'
2. Group by transaction_date (YYYY-MM-DD string, strip time)
3. Sort groups by date descending
4. Within each group, sort items by created_at descending (or amount descending)
```

Use `useMemo` to compute the grouped structure from the flat API response. Recompute only when the raw list changes.

**Collapse state management:**
- Track `Set<string>` of collapsed date keys in local `useState`
- Key format: `YYYY-MM-DD`
- Toggle: add to set = collapsed, remove from set = expanded
- "Thu gọn tất cả" / "Mở rộng tất cả" quick-action links above the grouped section (optional enhancement)

**Where recurring items go:**
Keep existing flat list sections for recurring items (unchanged). Grouped section appears below recurring section in Expenses/Incomes pages, or interspersed by source_type in Monthly Overview.

### New Component: `GroupedOneTimeList`

```
Props:
  items: OverviewItem[]   ← only one_time items passed in
  renderItem: (item) => ReactNode   ← reuse existing item row component
```

This component handles all grouping, sorting, and collapse logic internally. The parent page just filters out one_time items and passes them in. Existing item row components are reused unchanged.

---

## Requirement 2 — Calendar View Toggle

### Scope
- `ExpensesPage`
- `IncomesPage`
- `MonthlyOverviewPage`

### View Toggle Control

Add a view switcher in the top-right action area of each page, alongside existing controls:

```
┌───────────────────────────────────────────────────────┐
│  Chi Tiêu              [◀ May 2026 ▶]   [≡ List] [▦ Cal]│
└───────────────────────────────────────────────────────┘
```

- Two icon buttons: List view (≡) and Calendar view (▦)
- Active view button: filled/highlighted
- State stored in local `useState` per page (not persisted — defaults to List view on mount)
- Switching view does NOT trigger a new API call — uses the same React Query cached data

---

## Calendar View — Full Spec

### Calendar Grid Layout

Standard monthly calendar: 7 columns (Mon–Sun), rows for each week.

```
┌─────────────────────────────────────────────────────────────┐
│                      Tháng 5, 2026                           │
│  T2      T3      T4      T5      T6      T7      CN          │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┤
│      │      │      │      │  1   │  2   │  3   │
│      │      │      │      │79k ₫ │350k ₫│  —   │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  4   │  5   │  6   │  7   │  8   │  9   │ 10   │
│15M ₫ │  —   │200k ₫│  —   │500k ₫│  —   │  —   │
│ ...  │      │      │      │      │      │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

**Day cell content:**
- Day number (top-left, small)
- Total amount for that day (center, formatted as compact VND: `79k`, `1.5M`, etc.)
- Empty days: show `—` or nothing
- Today's date: highlighted border or background tint
- Days from previous/next month (padding cells): shown in muted color, no amounts

**Amount color coding:**
- Expenses page: red amounts
- Incomes page: green amounts
- Monthly Overview: show income in green + expense in red stacked, or net cashflow colored

---

## Calendar Day-to-Item Mapping (Frontend Logic)

This is the core computation. Run once via `useMemo` when data changes.

**Output:** `dayMap: Record<number, OverviewItem[]>` where key = day of month (1–31).

**Mapping rules per frequency type:**

### `one_time`
```
day = dayOfMonth(item.transaction_date)
dayMap[day].push(item)
```

### `monthly`
```
day = item.billing_day ?? item.payment_day ?? item.due_day ?? 1
dayMap[day].push(item)
```

### `yearly`
```
itemMonth = month(item.start_date)
if itemMonth === selectedMonth:
  day = dayOfMonth(item.start_date)
  dayMap[day].push(item)
```

### `weekly`
```
// Compute all occurrences of this weekly item within the selected month
startRef = item.start_date
for each week offset (0, 7, 14, 21, 28, 35):
  candidate = startRef + offset days (find first occurrence >= period_start)
  if candidate falls within selected month:
    dayMap[dayOfMonth(candidate)].push(item)
```
Note: weekly items may appear multiple times in a month (4–5 times). Each occurrence is a separate push.

**Important:** Use `date-fns` helpers for all date math — `getDate()`, `getMonth()`, `addDays()`, `isWithinInterval()`. Do not use raw Date arithmetic.

---

## Hover Popup (small — req 2.3)

### Trigger
`onMouseEnter` on day cell → show after 150ms delay
`onMouseLeave` on day cell → hide after 200ms delay (allows moving cursor into popup)

On touch devices: hover popup is disabled entirely (detect via `window.matchMedia('(hover: none)')`).

### Popup Layout (small)
Positioned above or below the day cell depending on available space.

```
┌────────────────────────────────┐
│  Thứ Năm, 01/05/2026           │
│  ────────────────────────────  │
│  • YouTube Premium     79,000₫ │
│  • Điện nước          350,000₫ │
│  • Lương              15M ₫    │
│  ────────────────────────────  │
│  Tổng: 429,000₫                │
└────────────────────────────────┘
```

**Constraints:**
- Max 5 items shown; if more: "...và 3 khoản khác"
- Max width: 280px
- No interactive elements (no buttons, no scroll) — overview only
- `z-index` above calendar grid
- Dismiss immediately on `onMouseLeave` (with delay)

### Popup Positioning
Use a floating strategy (Floating UI library or manual logic):
- Default: appear above the hovered cell
- If not enough space above: appear below
- Keep within viewport bounds horizontally

---

## Click Popup (large — req 2.4)

### Trigger
`onClick` on day cell → open large popup/dialog
Click outside popup → dismiss
Press Escape → dismiss
Click X button inside popup → dismiss

When click popup is open → hover popup is suppressed (check `isClickPopupOpen` state before showing hover popup).

### Popup Layout (large)

Use shadcn/ui `Dialog` component (modal overlay).

```
┌──────────────────────────────────────────────────┐
│  Chi tiêu ngày 01/05/2026              [X]        │  ← title + close
│  ─────────────────────────────────────────────── │
│  ĐỊNH KỲ                                          │  ← section header
│  [item row - full detail]                        │
│  [item row - full detail]                        │
│  ─────────────────────────────────────────────── │
│  MỘT LẦN                                          │  ← section header
│  [item row - full detail]                        │
│  ─────────────────────────────────────────────── │
│  Tổng ngày này:              429,000 ₫            │
└──────────────────────────────────────────────────┘
```

**Item rows in click popup:** Reuse the existing item row component from list view.

**Sections:** Group items within the popup as "Định Kỳ" (recurring) and "Một Lần" (one-time). If a section has no items, hide its header.

**Empty day:** If user clicks a day with no items, show: "Không có giao dịch nào trong ngày này."

**Scrollable:** Dialog body scrolls if many items; header + total footer are sticky.

**Title adapts per page:**
- Expenses page: "Chi tiêu ngày {date}"
- Incomes page: "Thu nhập ngày {date}"
- Monthly Overview: "Giao dịch ngày {date}"

---

## Monthly Overview Calendar — Additional Behavior

In the Monthly Overview calendar, each day cell shows both income and expense:

```
┌────────┐
│   8    │
│ +500k  │  ← green (income)
│ -200k  │  ← red (expense)
└────────┘
```

Or show net cashflow for the day with color (green if positive, red if negative):
```
┌────────┐
│   8    │
│ +300k  │  ← net, green
└────────┘
```

Implement the stacked version (income + expense separate lines) — more informative.

Personal loan items (debt_category = personal_lump_sum) that are in the overview: appear on their `borrow_date` day in the calendar. Mark them with the "Vay CN" badge color in the popup.

---

## New Components

### `ViewToggle`
```
Props:
  view: 'list' | 'calendar'
  onChange: (view) => void
```
Two icon buttons, reusable across all three pages.

### `MonthCalendar`
```
Props:
  year: number
  month: number          ← 1-based
  dayMap: Record<number, OverviewItem[]>
  mode: 'expense' | 'income' | 'overview'
  onDayClick: (day: number, items: OverviewItem[]) => void
  onDayHover: (day: number, items: OverviewItem[], anchorEl: HTMLElement) => void
  onDayHoverEnd: () => void
```
Renders the 7-column grid. Handles padding days from prev/next month. Does NOT manage popup state — delegates to parent.

### `CalendarHoverPopup`
```
Props:
  items: OverviewItem[]
  date: string
  anchorEl: HTMLElement | null
  visible: boolean
```
Small floating popup. Managed by parent page state.

### `CalendarDayDialog`
```
Props:
  items: OverviewItem[]
  date: string
  open: boolean
  onClose: () => void
  mode: 'expense' | 'income' | 'overview'
```
Large shadcn/ui Dialog. Reuses existing item row components.

### `GroupedOneTimeList`
```
Props:
  items: OverviewItem[]
  renderItem: (item: OverviewItem) => ReactNode
```
Handles grouping by date, sort, collapse/expand state. Fully self-contained.

---

## State Management Per Page

Each of the three pages manages locally (no Zustand changes needed):

```typescript
const [view, setView] = useState<'list' | 'calendar'>('list')

// Calendar state
const [hoverDay, setHoverDay] = useState<number | null>(null)
const [hoverAnchor, setHoverAnchor] = useState<HTMLElement | null>(null)
const [clickDay, setClickDay] = useState<number | null>(null)
const [isClickPopupOpen, setIsClickPopupOpen] = useState(false)

// Grouped list state
const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
```

---

## Performance Considerations

- `dayMap` computation: wrap in `useMemo([items])` — only recomputes when items change
- Hover popup: use a `useRef` timer for the 150ms delay, clear on cleanup
- Calendar grid: 35–42 cells is small, no virtualization needed
- Do NOT call any API on view switch or day interaction — all data is already in cache

---

## Files to Create/Modify

### New files
```
src/components/common/ViewToggle.tsx
src/components/common/MonthCalendar.tsx
src/components/common/CalendarHoverPopup.tsx
src/components/common/CalendarDayDialog.tsx
src/components/common/GroupedOneTimeList.tsx
src/utils/calendarMapping.ts       ← dayMap computation logic
```

### Modified files
```
src/pages/app/ExpensesPage.tsx       ← add ViewToggle, pass view to list/calendar
src/pages/app/IncomesPage.tsx        ← same
src/pages/app/MonthlyOverviewPage.tsx← same, plus overview-specific calendar behavior
```

No changes to: API client, Zustand stores, React Query keys, backend.

---

## Dependencies (check if already installed)

- `date-fns` — already in project per `frontend.md`
- `@floating-ui/react` — add if not present (for hover popup positioning)
- shadcn/ui `Dialog` — already available

If `@floating-ui/react` is not installed: implement basic positioning manually using `getBoundingClientRect()` + fixed positioning as fallback. Acceptable for this use case.