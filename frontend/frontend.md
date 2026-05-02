# frontend.md — AI Agent Guide: Personal Finance Frontend

## Overview
Build a **React + TypeScript** SPA for personal finance management. The app connects to the FastAPI backend, provides an intuitive dashboard, and supports managing debts, expenses, incomes, and AI-powered monthly analysis.

---

## Tech Stack
| Component | Technology |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| UI Library | shadcn/ui + Tailwind CSS |
| State Management | Zustand (global) + React Query (server state) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| HTTP Client | Axios (with interceptors) |
| Routing | React Router v6 |
| Date Handling | date-fns |
| Icons | Lucide React |

---

## Project Structure
```
frontend/
├── src/
│   ├── api/                  # Axios instance + typed API functions
│   │   ├── client.ts         # Base Axios config with auth interceptor
│   │   ├── auth.ts
│   │   ├── debts.ts
│   │   ├── expenses.ts
│   │   ├── incomes.ts
│   │   ├── dashboard.ts
│   │   └── ai.ts
│   ├── components/
│   │   ├── ui/               # shadcn/ui base components
│   │   ├── layout/
│   │   │   ├── PublicLayout.tsx   # Shared layout for Landing/About/Contact
│   │   │   ├── PublicNavbar.tsx   # Top navbar for public pages
│   │   │   ├── PublicFooter.tsx   # Footer for public pages
│   │   │   ├── Sidebar.tsx        # App sidebar (authenticated only)
│   │   │   ├── Header.tsx
│   │   │   └── AppLayout.tsx      # Layout wrapper for authenticated pages
│   │   ├── common/
│   │   │   ├── MonthPicker.tsx
│   │   │   ├── CurrencyDisplay.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── landing/          # Components specific to Landing page sections
│   │   ├── dashboard/
│   │   ├── debts/
│   │   ├── expenses/
│   │   ├── incomes/
│   │   └── ai/
│   ├── pages/
│   │   ├── public/           # No auth required
│   │   │   ├── LandingPage.tsx
│   │   │   ├── AboutPage.tsx
│   │   │   └── ContactPage.tsx
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   └── app/              # Auth required
│   │       ├── DashboardPage.tsx
│   │       ├── DebtsPage.tsx
│   │       ├── ExpensesPage.tsx
│   │       ├── IncomesPage.tsx
│   │       └── AIAnalysisPage.tsx
│   ├── store/
│   │   ├── authStore.ts      # JWT token, user info
│   │   └── uiStore.ts        # Selected month, sidebar state
│   ├── hooks/                # Custom React hooks
│   ├── types/                # TypeScript interfaces matching backend schemas
│   ├── utils/
│   │   ├── currency.ts       # VND formatting helpers
│   │   └── date.ts           # Period key helpers
│   └── router.tsx
├── Dockerfile
├── nginx.conf
├── vite.config.ts
└── .env.example
```

---

## Routing Structure

The app has two distinct route groups with separate layouts:

```
/ (public)           → LandingPage    [PublicLayout]
/about (public)      → AboutPage      [PublicLayout]
/contact (public)    → ContactPage    [PublicLayout]
/login (public)      → LoginPage      [bare, no layout]

/app/dashboard       → DashboardPage  [AppLayout, protected]
/app/debts           → DebtsPage      [AppLayout, protected]
/app/expenses        → ExpensesPage   [AppLayout, protected]
/app/incomes         → IncomesPage    [AppLayout, protected]
/app/ai              → AIAnalysisPage [AppLayout, protected]
```

**Route Guards:**
- `PublicLayout` routes: accessible to everyone — if already logged in, show "Vào Ứng Dụng" in navbar instead of "Đăng Nhập"
- `AppLayout` routes: wrapped in `<ProtectedRoute>` — redirect to `/login` if no valid token
- `/login`: if already authenticated → redirect to `/app/dashboard`

---

## Pages & Features

### Landing Page (`/`)

The public-facing home page. Introduces the project to new visitors and encourages login.

**Layout:** `PublicLayout` (PublicNavbar + PublicFooter, no sidebar)

**Sections (top to bottom):**

**Hero Section**
- Bold headline: e.g., "Quản Lý Tài Chính Cá Nhân — Đơn Giản & Thông Minh"
- Subheading: 1–2 lines describing the core value proposition
- Two CTA buttons: "Bắt Đầu Ngay" (primary → `/login`) and "Tìm Hiểu Thêm" (secondary → scrolls to Features section)
- Background: subtle gradient or abstract finance-themed illustration (SVG, no stock photos)

**Features Section** (`id="features"` for scroll anchor)
- Grid of 6 feature cards, each with icon + title + 1-sentence description:
  - 💳 Quản lý nợ & tín dụng
  - 📅 Theo dõi chi tiêu định kỳ (subscriptions, hóa đơn)
  - 💰 Ghi nhận nhiều nguồn thu nhập
  - 📊 Dashboard tổng quan theo tháng
  - 🤖 Phân tích AI theo tháng (on-demand, không tự động)
  - 🔒 Dữ liệu cá nhân, bảo mật JWT

**How It Works Section**
- 3-step numbered flow with icons:
  1. Thêm các khoản thu, chi, nợ của bạn
  2. Xem dashboard tổng quan theo từng tháng
  3. Nhận phân tích AI và đề xuất cải thiện tài chính

**Tech Stack Section**
- Small badge/pill row: FastAPI · React · PostgreSQL · Redis · Docker · OpenRouter
- Useful if this is a portfolio or open-source project

**Final CTA Section**
- Centered: "Bắt đầu quản lý tài chính của bạn hôm nay"
- Single primary button: "Đăng Nhập / Vào Ứng Dụng" → `/login`

---

### About Page (`/about`)

Describes the project background, purpose, and the person/team behind it. **All content is static — no API calls.**

**Layout:** `PublicLayout`

**Sections:**

**Page Header**
- Title: "Về Dự Án"
- Short tagline beneath

**Project Story**
- 2–3 paragraphs (hardcoded static text):
  - Why this project was built (personal need for finance tracking)
  - What problems it solves vs. existing tools
  - Design philosophy: simple, private, self-hosted

**Goals & Principles**
- Icon list:
  - 🎯 Đơn giản — không phức tạp hóa việc quản lý tiền
  - 🔒 Riêng tư — dữ liệu lưu trên hệ thống của bạn, không cloud bên thứ ba
  - 🤖 Thông minh — AI hỗ trợ phân tích, không thay thế quyết định của bạn
  - 🚀 Mở rộng được — Docker Compose, dễ self-host

**Tech Stack Overview**
- Table or icon grid: FastAPI · React · PostgreSQL · Redis · Docker · OpenRouter
- Each entry has a 1-line description of its role in the project

**Author Block**
- Brief intro: name, role/background
- Links: GitHub repository, email, or link to Contact page (`/contact`)

---

### Contact Page (`/contact`)

Static contact form. Submissions either call a backend endpoint or fall back to a `mailto:` link.

**Layout:** `PublicLayout`

**Sections:**

**Page Header**
- Title: "Liên Hệ"
- Subtext: "Có câu hỏi hoặc đề xuất? Hãy liên hệ với tôi."

**Contact Form**
Fields (validated with Zod, client-side):
- `Họ và tên` — text, required
- `Email` — email format, required
- `Chủ đề` — text, optional
- `Nội dung` — textarea, required, min 10 characters
- Submit button: "Gửi Tin Nhắn"

Form behavior:
- If backend has `POST /api/v1/contact` → call it (unauthenticated endpoint)
- If no backend endpoint → fallback: open `mailto:your@email.com` with pre-filled subject/body
- On success: replace form with success message ("Cảm ơn! Tôi sẽ phản hồi sớm nhất có thể.") + "Gửi tin khác" link to reset
- On error: error toast, form remains editable

**Contact Info Block** (beside form on desktop, below on mobile)
- 📧 Email address (static)
- 🐙 GitHub repository link
- 🕐 "Tôi sẽ phản hồi trong vòng 1–3 ngày làm việc"

**Form States:**
- Default → Submitting (button spinner, fields disabled) → Success | Error

---

### Public Layout Components

#### `PublicNavbar`
Top navigation bar on Landing, About, Contact pages.

- **Left:** App logo + project name
- **Center (desktop):** Nav links — Trang Chủ (`/`) · Giới Thiệu (`/about`) · Liên Hệ (`/contact`)
- **Right:**
  - Not authenticated → "Đăng Nhập" button → `/login`
  - Authenticated → "Vào Ứng Dụng" button → `/app/dashboard`
- **Mobile:** Hamburger → sheet/drawer with all nav links + CTA button
- Active link: underline or accent color highlight for current route

#### `PublicFooter`
Shown at bottom of all public pages:
- **Left:** App name + short tagline
- **Center:** Quick links — Trang Chủ · Giới Thiệu · Liên Hệ
- **Right:** GitHub link + `© 2025 · Built with FastAPI & React`
- Thin top border, slightly muted background vs. page

---

### Login Page
- Simple email/password form
- On success: store JWT in memory (not localStorage for security), redirect to Dashboard
- Optional: "Remember me" → store refresh token in httpOnly cookie via backend
- Show error on invalid credentials

### Dashboard Page (Main Page)
The central overview — most important page.

**Month Selector Component (Global)**
- Sticky at top, allows user to navigate month/year
- Default: current month
- All data on the page reacts to this selection
- Persisted in Zustand `uiStore` so all pages share the same selected period

**Summary Cards Row**
Four cards at top:
1. **Tổng Thu Nhập** (Total Income) — green
2. **Tổng Chi Tiêu** (Total Expense) — red  
3. **Tổng Trả Nợ** (Total Debt Payments) — orange
4. **Dòng Tiền Ròng** (Net Cashflow) — green if positive, red if negative

**Charts Section**
- **Cashflow Trend Chart** (Recharts BarChart or LineChart): last 6 months income vs expense
- **Expense Breakdown** (Recharts PieChart): by expense_type category for selected month

**Quick Lists**
- Top 3 upcoming payments this month (debts due soon)
- Active subscriptions count + total amount
- Upcoming income sources

**AI Analysis Card**
- Shows status: "No analysis yet" / "Analysis available" / "Generating..."
- Button: "Xem Phân Tích AI" → navigates to AI Analysis page
- Last analysis date shown if available

### Debts Page
**List View**
- Table/card list of all debts
- Columns: Name, Type badge, Remaining Amount, Monthly Payment, Interest Rate, Due Day, Status badge
- Filter: by status (active/paid_off), by type
- Sort: by remaining amount, by due date
- Each row has: Edit button, Delete button (with confirm dialog)

**Add/Edit Drawer (Slide-in from right)**
- Form fields: name, debt_type (select), principal_amount, remaining_amount, interest_rate, monthly_payment, due_day, start_date, end_date, status, notes
- Validation via Zod schema
- On submit: POST or PUT to backend → React Query invalidate debts list

**Debt Detail View (Optional modal)**
- Payment history timeline
- Progress bar: remaining/principal

### Expenses Page
**List View**
- Separate tabs: "Định Kỳ" (Recurring) / "Một Lần" (One-time)
- Recurring tab: cards or table with Name, Type, Amount, Frequency badge, Billing Day, Active toggle
- One-time tab: grouped by month, shows transaction_date

**Add/Edit Drawer**
- Form: name, expense_type (select), amount, frequency (select), billing_day (conditional — show only if monthly/weekly/yearly), start_date, end_date, is_active toggle, notes
- When frequency = one_time: show transaction_date field instead of billing_day

**Active Toggle**
- Switch component directly in list row
- PATCH `is_active` field inline without opening full edit form

### Incomes Page
Similar structure to Expenses Page.
- Tabs: "Định Kỳ" / "Một Lần"
- Form: name, income_type (select), amount, frequency, payment_day, start_date, end_date, is_active toggle, notes
- Show color-coded income_type badges: Salary (blue), Trading (purple), Freelance (teal), Passive (green), Other (gray)

### AI Analysis Page
**Period Header**
- Shows selected month/year prominently
- Month navigation arrows

**Analysis States**

*State 1: No analysis yet*
- Empty state illustration
- Text: "Chưa có phân tích AI cho tháng [month/year]"
- Button: "Tạo Phân Tích" (primary, outlined)
- Small note: "AI sẽ phân tích dữ liệu tài chính của bạn và đề xuất cải thiện"

*State 2: Analysis exists (view mode)*
- Show `created_at` timestamp
- Show `model_used` badge
- Render analysis_text as formatted markdown (react-markdown)
- Button: "Tạo Lại" (secondary, with warning: "sẽ ghi đè phân tích cũ")

*State 3: Generating*
- Loading spinner with text: "Đang phân tích... có thể mất 15-30 giây"
- Disable all buttons

**Flow when user clicks "Tạo Phân Tích":**
1. Call `GET /api/v1/ai/analysis?period=YYYY-MM`
2. If analysis exists → go to State 2
3. If not exists → call `POST /api/v1/ai/analysis/generate?period=YYYY-MM`
4. Show State 3 (loading) while waiting
5. On success → display State 2

---

## Global Components

### Sidebar Navigation (App Pages Only)
Shown only when authenticated, inside `AppLayout`. Does NOT appear on public pages.

Links:
- 🏠 Dashboard (`/app/dashboard`)
- 💳 Nợ (`/app/debts`)
- 💸 Chi Tiêu (`/app/expenses`)
- 💰 Thu Nhập (`/app/incomes`)
- 🤖 Phân Tích AI (`/app/ai`)

Sidebar shows: current user name, logout button.
On mobile: collapses to bottom navigation bar.

### MonthPicker Component
- Persistent in Zustand `uiStore` as `selectedPeriod: string` (YYYY-MM format)
- Previous/next month arrows
- Clicking month name opens a year/month grid picker
- Shared across all pages via the store

### CurrencyDisplay Component
- Always formats VND: `1,500,000 ₫`
- Support colorize prop: green for income, red for expense
- Support compact mode: `1.5M ₫`

### ConfirmDialog Component
- Used before any delete operation
- Props: title, description, confirmText, onConfirm, onCancel
- Danger variant (red confirm button) for destructive actions

---

## State Management Strategy

### Zustand Stores
**`authStore`**
- `accessToken`: string | null (in memory only)
- `user`: { id, username, email }
- `setToken()`, `logout()`

**`uiStore`**
- `selectedPeriod`: string (YYYY-MM, defaults to current month)
- `sidebarOpen`: boolean
- `setSelectedPeriod()`, `toggleSidebar()`

### React Query Usage
- All API data fetched via `useQuery` hooks
- Query keys include `selectedPeriod` so data refetches on month change
- `useMutation` for create/update/delete with `onSuccess` → `queryClient.invalidateQueries`
- Stale time: 5 minutes for list data, 1 minute for dashboard summary

---

## HTTP Client Configuration

### Axios Interceptors
**Request interceptor:**
- Attach `Authorization: Bearer {token}` from authStore
- Add `Content-Type: application/json`

**Response interceptor:**
- On 401 → clear token → redirect to login
- On network error → show toast notification

### API Base URL
- Dev: `http://localhost:8000/api/v1`
- Prod: from `VITE_API_BASE_URL` env var

---

## Form Patterns

### All Add/Edit Forms Use:
- React Hook Form + Zod validation
- Drawer component (slide from right, not modal) — better UX for forms with many fields
- Form fields have clear labels in Vietnamese
- Monetary fields: format display as VND while storing raw number
- Date fields: use HTML date input, store as ISO string
- On submit error: show field-level error messages
- On submit success: close drawer + show success toast + invalidate query

### Frequency-conditional Fields
```
if frequency === "one_time":
  show: transaction_date (required)
  hide: billing_day, start_date/end_date

if frequency in ["monthly", "weekly", "yearly"]:
  show: billing_day/payment_day, start_date, end_date
  hide: transaction_date
```

---

## UX/UI Design Guidelines

### Color Palette
- Income: `green-500` / `#22c55e`
- Expense: `red-500` / `#ef4444`
- Debt: `orange-500` / `#f97316`
- Neutral: Tailwind `slate-*`
- Background: `slate-950` (dark) or `white` (light)

### Typography
- Currency values: always large, bold, right-aligned
- Labels: smaller, muted color
- Status badges: pill shape, color-coded

### Interaction Feedback
- All buttons show loading spinner during async operations
- Toast notifications (top-right) for: create success, update success, delete success, errors
- Skeleton loaders while data is fetching (not blank screens)
- Optimistic UI for toggle operations (is_active switch)

### Responsiveness
- Desktop: sidebar + main content area
- Tablet: collapsible sidebar
- Mobile: bottom navigation bar, stacked cards

---

## Environment Variables (.env.example)
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## Dockerfile Notes
- Build stage: Node 20 Alpine → run `npm run build`
- Serve stage: Nginx Alpine → serve `/dist`
- nginx.conf: proxy `/api` to backend service; serve SPA with `try_files $uri /index.html`

---

## TypeScript Types (Key Interfaces)
Define in `src/types/` to match backend Pydantic schemas exactly:
- `Debt`, `CreateDebtRequest`, `UpdateDebtRequest`
- `Expense`, `CreateExpenseRequest`, `UpdateExpenseRequest`
- `Income`, `CreateIncomeRequest`, `UpdateIncomeRequest`
- `DashboardSummary`, `MonthlyTrend`
- `AIAnalysis`, `GenerateAnalysisResponse`
- `AuthToken`, `User`

All monetary fields typed as `number` (Decimal from backend arrives as string in JSON — parse to number on receipt).
