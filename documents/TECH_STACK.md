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
