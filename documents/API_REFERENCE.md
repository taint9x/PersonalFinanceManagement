# API Reference

The backend API is served at `/api/v1` (internal) and proxied via Nginx at `/api`.

## Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive JWT access token |
| GET | `/auth/me` | Get current user profile |

## Transactions (Expenses & Incomes)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/transactions` | List all transactions with filters |
| POST | `/expenses` | Create a new expense entry |
| GET | `/expenses` | List expense entries |
| POST | `/incomes` | Create a new income entry |
| GET | `/incomes` | List income entries |

## Dashboard & Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/summary` | Get financial summary for a period (monthly) |
| GET | `/dashboard/trends` | Get spending trends over time |

## Debts & Loans
| Method | Endpoint | Description |
|---|---|---|
| GET | `/debts` | List all debts/loans |
| POST | `/debts` | Record a new debt or loan |
| PUT | `/debts/{id}` | Update debt status (e.g., mark as paid) |

## AI Analysis
| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai-analysis/generate` | Trigger AI analysis of financial data |
| GET | `/ai-analysis/history` | View previous AI analysis results |

## Monthly Overview
| Method | Endpoint | Description |
|---|---|---|
| GET | `/monthly-overview?period=YYYY-MM` | Unified list of debts/expenses/incomes for the month |
| POST | `/monthly-overview/mark-paid` | UPSERT payment record as paid |
| POST | `/monthly-overview/mark-unpaid` | UPSERT payment record as unpaid |
| GET | `/monthly-overview/export/excel?period=YYYY-MM` | Stream Excel file (4 sheets) |

## Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications/history?limit=N` | List notification send history for current user |
| POST | `/notifications/send-now?period=YYYY-MM` | Manually trigger monthly report send |

## Error Responses
- `400 Bad Request`: Invalid period format or other bad input.
- `401 Unauthorized`: Missing or invalid JWT token.
- `403 Forbidden`: Insufficient permissions.
- `404 Not Found`: Resource does not exist.
- `422 Unprocessable Entity`: Validation error in request body.
- `503 Service Unavailable`: External service (SMTP/Telegram) unreachable.
