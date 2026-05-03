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

## Error Responses
- `401 Unauthorized`: Missing or invalid JWT token.
- `403 Forbidden`: Insufficient permissions.
- `404 Not Found`: Resource does not exist.
- `422 Unprocessable Entity`: Validation error in request body.
