# integrate.md — AI Agent Guide: Frontend ↔ Backend Integration

## Overview
This document defines the integration contract between the React frontend and FastAPI backend. Both services are implemented separately — this guide is the source of truth for how they communicate.

---

## Integration Architecture

```
[React Frontend :3000]
        │
        │ HTTP/JSON (REST API)
        ▼
[Nginx (in frontend container)]
        │
        │ Proxy /api → :8000
        ▼
[FastAPI Backend :8000]
        │                    │
        ▼                    ▼
[PostgreSQL :5432]      [Redis :6379]
```

All traffic in production goes through Nginx. The frontend never calls the backend IP directly in production — it calls `/api/v1/...` and Nginx proxies to the backend container.

---

## Authentication Flow

### Login Sequence
```
1. User submits credentials to POST /api/v1/auth/login
2. Backend returns { access_token, token_type, expires_in }
3. Frontend stores access_token in Zustand memory store (NOT localStorage)
4. All subsequent requests include: Authorization: Bearer {access_token}
5. On 401 response: clear token, redirect to /login
```

### Token Handling Rules
- Access token lives in memory only (lost on page refresh)
- On page refresh: user is redirected to login (acceptable for personal app)
- Token expiry: 24 hours (configured in backend JWT_EXPIRE_MINUTES)
- If implementing refresh tokens later: store refresh token in httpOnly cookie

---

## CORS Configuration

Backend must allow:
```
Origins: http://localhost:3000 (dev), https://yourdomain.com (prod)
Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Headers: Content-Type, Authorization
Allow Credentials: true
```

In development with Docker Compose, frontend and backend are on the same Docker network. The Nginx proxy handles routing so CORS issues are minimized, but backend still needs CORS configured for direct API calls during development.

---

## API Contract

### Common Response Format

**Success (single item):**
```json
{
  "id": "uuid",
  "created_at": "2025-01-15T10:00:00Z",
  ...fields
}
```

**Success (list):**
```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

**Error:**
```json
{
  "detail": "Human-readable message in Vietnamese or English",
  "code": "SNAKE_CASE_ERROR_CODE"
}
```

### Monetary Values
- Backend sends: string (Decimal serialized as string) e.g., `"1500000.00"`
- Frontend receives: parse to `number` for display, keep as string for API calls
- Never do floating-point math on currency — display only

### Date/Time Format
- Backend stores: UTC timestamps
- API sends/receives: ISO 8601 strings `"2025-04-01T00:00:00Z"`
- Frontend displays: formatted with date-fns in local timezone (Asia/Ho_Chi_Minh)
- Period keys: `"YYYY-MM"` string format for all period-based queries

---

## Endpoint-to-Component Mapping

### Dashboard Page
| Component | API Call | React Query Key |
|---|---|---|
| Summary Cards | `GET /dashboard/summary?period=YYYY-MM` | `['dashboard', 'summary', period]` |
| Trend Chart | `GET /dashboard/monthly-trend?months=6` | `['dashboard', 'trend']` |
| AI Status Card | `GET /ai/analysis?period=YYYY-MM` | `['ai', 'analysis', period]` |

### Debts Page
| Action | API Call | On Success |
|---|---|---|
| Load list | `GET /debts` | — |
| Create | `POST /debts` | Invalidate `['debts']` |
| Update | `PUT /debts/{id}` | Invalidate `['debts']` |
| Delete | `DELETE /debts/{id}` | Invalidate `['debts']` |

### Expenses Page
| Action | API Call | Notes |
|---|---|---|
| Load recurring | `GET /expenses?frequency=monthly,weekly,yearly` | |
| Load one-time | `GET /transactions?type=expense&period=YYYY-MM` | |
| Toggle active | `PATCH /expenses/{id}` with `{is_active: bool}` | Optimistic update |
| Create recurring | `POST /expenses` | |
| Create one-time | `POST /transactions` with `source_type=expense` | |

### Incomes Page
Same pattern as Expenses, swap endpoint paths.

### AI Analysis Page
| Action | API Call | Notes |
|---|---|---|
| Check existing | `GET /ai/analysis?period=YYYY-MM` | Returns 404 if none |
| Generate new | `POST /ai/analysis/generate?period=YYYY-MM` | May take 15-30s |
| Force regenerate | `POST /ai/analysis/generate?period=YYYY-MM&force=true` | Overwrites existing |

---

## React Query Configuration

### Query Client Setup (main.tsx)
```
defaultOptions:
  queries:
    staleTime: 5 * 60 * 1000          (5 minutes)
    cacheTime: 10 * 60 * 1000         (10 minutes)
    retry: 1
    refetchOnWindowFocus: false
  mutations:
    onError: show global error toast
```

### Query Key Convention
Always structure as `[entity, action, ...params]`:
```
['debts', 'list']
['expenses', 'list', { frequency: 'monthly' }]
['dashboard', 'summary', '2025-04']
['ai', 'analysis', '2025-04']
```

This ensures proper cache invalidation — invalidating `['debts']` clears all debt-related queries.

---

## Month Selection Synchronization

The `selectedPeriod` in Zustand `uiStore` is the single source of truth for the current month being viewed. 

Rules:
- MonthPicker component writes to `uiStore.selectedPeriod`
- All pages read from `uiStore.selectedPeriod` and include it in their React Query keys
- Changing the month auto-triggers refetch of all relevant queries
- Period is NOT persisted to localStorage (user starts at current month on refresh)

---

## Loading & Error States

### Every data-fetching component must handle:
1. **Loading state** — show Skeleton loader (shadcn/ui Skeleton)
2. **Error state** — show error card with retry button
3. **Empty state** — show EmptyState component with CTA to add first record

### Toast Notifications
Use shadcn/ui `Sonner` or `Toast`:
- ✅ Success: `"Đã lưu thành công"`
- ❌ Error: Backend `detail` message if available, else generic "Có lỗi xảy ra"
- ⏳ Loading (AI generation): persistent toast until complete

---

## Form Validation Alignment

Frontend Zod schema must match backend Pydantic validation exactly:

| Field | Backend | Frontend Zod |
|---|---|---|
| `amount` | `Decimal > 0` | `z.number().positive()` |
| `interest_rate` | `Decimal 0-100` | `z.number().min(0).max(100)` |
| `due_day` | `int 1-31` | `z.number().int().min(1).max(31)` |
| `period_key` | `str YYYY-MM` | `z.string().regex(/^\d{4}-\d{2}$/)` |
| `frequency` | enum | `z.enum(['one_time', 'weekly', 'monthly', 'yearly'])` |

When backend returns a 422 validation error, frontend should map field names to form field errors.

---

## Environment-Based API URL

### Development (direct)
Frontend dev server (Vite) calls backend directly:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Production (via Nginx proxy)
Frontend in Docker calls via relative path:
```
VITE_API_BASE_URL=/api/v1
```
Nginx routes `/api/v1/*` → `http://backend:8000/api/v1/*`

The Vite build must inject the correct base URL at build time. Use `VITE_API_BASE_URL` env var in `vite.config.ts`.

---

## Nginx Proxy Configuration (frontend container)

```nginx
# Key rules:
# 1. Proxy /api to backend service
location /api/ {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    # Increase timeout for AI generation (30s+)
    proxy_read_timeout 120s;
}

# 2. SPA routing — serve index.html for all other routes
location / {
    root /usr/share/nginx/html;
    try_files $uri /index.html;
}
```

Note: `proxy_read_timeout 120s` is important for AI analysis generation which may take longer than the default 60s.

---

## Integration Testing Checklist

Before declaring integration complete, verify:

**Auth Flow**
- [ ] Login with valid credentials → receives token
- [ ] Login with invalid credentials → 401 shown in UI
- [ ] Token included in all subsequent requests (check Network tab)
- [ ] 401 response → redirect to login

**CRUD Operations**
- [ ] Create debt → appears in list without page refresh
- [ ] Update debt → list reflects changes immediately
- [ ] Delete debt → removed from list with confirmation dialog
- [ ] Same for expenses and incomes

**Dashboard**
- [ ] Month change → all cards refresh
- [ ] Numbers match: sum of income records = Total Income card
- [ ] Chart data shows correct months

**AI Analysis**
- [ ] Period with no analysis → shows empty state + generate button
- [ ] Click generate → loading state shown → result appears after API returns
- [ ] Navigate away and back → analysis still shown (cached in React Query)
- [ ] Re-generation with force=true → overwrites old result

**Error Handling**
- [ ] Backend down → error toast shown, not white screen
- [ ] Invalid form data → field errors shown under inputs
- [ ] OpenRouter API key invalid → clear error message shown to user

---

## Development Setup (Local without Docker)

For running frontend and backend separately during development:

1. Backend: `cd backend && uvicorn app.main:app --reload --port 8000`
2. Frontend: `cd frontend && npm run dev` (runs on port 3000)
3. Set `VITE_API_BASE_URL=http://localhost:8000/api/v1` in `frontend/.env.local`
4. Backend CORS must allow `http://localhost:3000`

Database and Redis still run via Docker Compose partial stack:
```bash
docker compose up postgres redis -d
```
