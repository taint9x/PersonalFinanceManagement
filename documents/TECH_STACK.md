# Technology Stack Decisions

## Backend: FastAPI
**Choice**: FastAPI (Python)
**Rationale**:
- **High Performance**: Asynchronous by nature, built on Starlette and Pydantic.
- **Type Safety**: Leverage Python type hints for automatic validation and interactive docs (Swagger).
- **Developer Productivity**: Faster development cycles compared to Django for RESTful APIs.

## Frontend: React + Vite
**Choice**: React with Vite and TypeScript
**Rationale**:
- **Speed**: Vite provides near-instant HMR (Hot Module Replacement).
- **Ecosystem**: React has the largest library ecosystem for UI components.
- **shadcn/ui**: High-quality, accessible components that are easy to customize.

## Database: PostgreSQL
**Choice**: PostgreSQL 16
**Rationale**:
- **Reliability**: Industry-standard ACID compliance.
- **JSONB Support**: Flexibility for storing semi-structured AI analysis results.
- **Scalability**: Handles relational data and complex queries efficiently.

## Caching & Session: Redis
**Choice**: Redis 7
**Rationale**:
- **Latency**: Sub-millisecond response times for caching frequently accessed data.
- **Versatility**: Used for session management and potential task queues (Celery).

## AI Integration: OpenRouter
**Choice**: OpenRouter API
**Rationale**:
- **Model Flexibility**: Single API to access Claude, GPT, and Llama models.
- **Cost Management**: Standardized pricing and easy model switching without code changes.

## Infrastructure: Docker
**Choice**: Docker Compose
**Rationale**:
- **Environment Parity**: Ensures the app runs exactly the same on dev, staging, and production.
- **Simplified Setup**: One command to orchestrate multiple services (DB, Redis, Backend, Frontend).

## Excel Export: openpyxl
**Choice**: openpyxl
**Rationale**:
- **Server-side**: All formatting is done in Python, no client-side libraries needed.
- **Streaming**: Works with `StreamingResponse` for memory-efficient large exports.

## Email: aiosmtplib + Jinja2
**Choice**: aiosmtplib for async SMTP, Jinja2 for HTML templates
**Rationale**:
- **Async**: Fits FastAPI's async architecture without blocking the event loop.
- **Jinja2**: Powerful templating already widely used in Python web stacks.

## Scheduler: APScheduler
**Choice**: APScheduler (AsyncIOScheduler)
**Rationale**:
- **In-process**: Runs inside the existing backend container — no extra infra needed.
- **Cron syntax**: Supports last-day-of-month triggers natively.
- **Async-native**: Integrates cleanly with FastAPI's asyncio event loop.
