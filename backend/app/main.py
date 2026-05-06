from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.v1 import auth, debts, expenses, incomes, transactions, dashboard, ai_analysis
from app.api.v1 import monthly_overview, notifications


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup: launch scheduler ─────────────────────────────────────────────
    if settings.SCHEDULER_ENABLED:
        try:
            from scheduler.runner import start_scheduler
            start_scheduler()
        except Exception as exc:
            # Scheduler failure must never crash the main app
            import logging
            logging.getLogger("app").warning(f"Scheduler failed to start: {exc}")
    yield
    # ── Shutdown: stop scheduler ──────────────────────────────────────────────
    if settings.SCHEDULER_ENABLED:
        try:
            from scheduler.runner import shutdown_scheduler
            shutdown_scheduler()
        except Exception:
            pass


app = FastAPI(
    title="FinyTrack API",
    description="Backend API for FinyTrack — debts, expenses, incomes, AI analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"
app.include_router(auth.router, prefix=PREFIX)
app.include_router(debts.router, prefix=PREFIX)
app.include_router(expenses.router, prefix=PREFIX)
app.include_router(incomes.router, prefix=PREFIX)
app.include_router(transactions.router, prefix=PREFIX)
app.include_router(dashboard.router, prefix=PREFIX)
app.include_router(ai_analysis.router, prefix=PREFIX)
app.include_router(monthly_overview.router, prefix=PREFIX)
app.include_router(notifications.router, prefix=PREFIX)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


# ── Global error handler ──────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "code": "INTERNAL_ERROR"},
    )

