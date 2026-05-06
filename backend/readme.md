# LOCAL

docker compose up -d

uvicorn app.main:app --host 0.0.0.0 --port 8001 --env-file ./.env.dev --reload


# PROD

cd /app
export DATABASE_URL=postgresql+asyncpg://finance_user:finance_pass@db:5432/finance_db
export REDIS_URL=redis://redis:6379/0
export JWT_SECRET_KEY=change-me-in-production
export JWT_ALGORITHM=HS256
export JWT_EXPIRE_MINUTES=1440
export OPENROUTER_API_KEY=your-openrouter-key
export OPENROUTER_MODEL=anthropic/claude-3-haiku
export OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
export APP_ENV=production
export APP_HOST=[IP_ADDRESS]
export APP_PORT=8000
export CORS_ORIGINS=http://localhost:3000,http://frontend:3000

# Run with uvicorn
uvicorn app.main:app --host [IP_ADDRESS] --port 8000 --workers 2

# Or run with gunicorn for multi-process support
gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker -b [IP_ADDRESS]:8000

# Run with Gunicorn and Supervisor (for auto-restart and logging)
# Create a supervisor config at /etc/supervisor/conf.d/finance-api.conf:
#
# [program:finance-api]
# command=sh -c "cd /app && export DATABASE_URL=postgresql+asyncpg://finance_user:finance_pass@db:5432/finance_db && export REDIS_URL=redis://redis:6379/0 && export JWT_SECRET_KEY=change-me-in-production && export JWT_ALGORITHM=HS256 && export JWT_EXPIRE_MINUTES=1440 && export OPENROUTER_API_KEY=your-openrouter-key && export OPENROUTER_MODEL=anthropic/claude-3-haiku && export OPENROUTER_BASE_URL=https://openrouter.ai/api/v1 && export APP_ENV=production && export APP_HOST=[IP_ADDRESS] && export APP_PORT=8000 && export CORS_ORIGINS=http://localhost:3000,http://frontend:3000 && uvicorn app.main:app --host [IP_ADDRESS] --port 8000 --workers 2"
# directory=/app
# user=finance_user
# autostart=true
# autorestart=true
# stderr_logfile=/var/log/finance-api.err.log
# stdout_logfile=/var/log/finance-api.out.log
