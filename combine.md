# combine.md — AI Agent Guide: Docker Compose & Project Assembly

## Overview
This document defines the full project structure, Docker Compose configuration, environment setup, and operational runbook for the Personal Finance Management system. The goal: one command to run the entire stack.

---

## Project Structure (Final)

```
./                                  ← Project root
├── docker-compose.yml              ← Full stack orchestration
├── docker-compose.dev.yml          ← Dev overrides (hot reload, exposed ports)
├── .env                            ← Single env file for Docker Compose
├── .env.example                    ← Template (committed to git)
├── .gitignore
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   ├── alembic/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── alembic.ini
│
└── documents/
    ├── README.md                   ← Project overview and quick start
    ├── TECH_STACK.md               ← Full technology decisions and rationale
    ├── API_REFERENCE.md            ← All endpoints with request/response examples
    ├── DATABASE_SCHEMA.md          ← Tables, columns, relationships (ERD)
    ├── SETUP_GUIDE.md              ← Human step-by-step setup guide (see below)
    ├── AI_INTEGRATION.md           ← OpenRouter setup and usage guide
    └── ARCHITECTURE.md             ← System architecture diagram and flow
```

---

## Docker Compose Services

### Services Overview

| Service | Image | Port | Role |
|---|---|---|---|
| `frontend` | Built from `./frontend/Dockerfile` | 3000 | Nginx serving React SPA + API proxy |
| `backend` | Built from `./backend/Dockerfile` | 8000 | FastAPI application |
| `postgres` | `postgres:16-alpine` | 5432 | Primary database |
| `redis` | `redis:7-alpine` | 6379 | Cache layer |

### Service Dependencies
```
frontend → (depends on) backend
backend  → (depends on) postgres, redis
postgres → (no deps)
redis    → (no deps)
```

### Health Checks
All services must define health checks:
- `postgres`: `pg_isready -U $POSTGRES_USER`
- `redis`: `redis-cli ping`
- `backend`: `GET http://localhost:8000/health`
- `frontend`: `GET http://localhost:3000`

Backend service uses `depends_on: postgres: condition: service_healthy` to ensure DB is ready before running Alembic migrations.

### Volumes
```
postgres_data   → /var/lib/postgresql/data   (persistent DB data)
redis_data      → /data                       (optional: Redis persistence)
```

### Networks
Single bridge network `finance_network`. All containers communicate by service name.

---

## Docker Compose File Structure

### docker-compose.yml (Production)

```yaml
# Key configuration points per service:

# postgres:
#   - image: postgres:16-alpine
#   - env: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB from .env
#   - volume: postgres_data
#   - healthcheck: pg_isready

# redis:
#   - image: redis:7-alpine
#   - command: redis-server --appendonly yes (persistence)
#   - volume: redis_data

# backend:
#   - build: ./backend
#   - env_file: .env
#   - depends_on: postgres (healthy), redis (healthy)
#   - entrypoint: runs alembic upgrade head THEN starts uvicorn
#   - expose: 8000 (not mapped to host in production — only accessible internally)

# frontend:
#   - build: ./frontend
#     args: VITE_API_BASE_URL=/api/v1
#   - ports: "3000:80"  ← only public-facing port
#   - depends_on: backend
```

### docker-compose.dev.yml (Development Overrides)

Used with: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`

Key differences from production:
- Backend: mount `./backend:/app` volume for hot reload (uvicorn --reload)
- Frontend: run Vite dev server instead of Nginx (port 5173, calls backend directly)
- Postgres: expose port 5432 to host (for DB client tools like DBeaver)
- Redis: expose port 6379 to host
- Backend: expose port 8000 to host (for direct API testing / Swagger UI)

---

## Environment Variables (.env)

```bash
# ============================================
# Personal Finance App — Environment Variables
# ============================================

# --- PostgreSQL ---
POSTGRES_USER=financeapp
POSTGRES_PASSWORD=changeme_secure_password
POSTGRES_DB=finance_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Backend uses this full URL:
DATABASE_URL=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

# --- Redis ---
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}/0

# --- JWT Authentication ---
JWT_SECRET_KEY=REPLACE_WITH_LONG_RANDOM_STRING_MIN_32_CHARS
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# --- Initial Admin User (created on first run) ---
INITIAL_USERNAME=admin
INITIAL_PASSWORD=changeme_on_first_login

# --- OpenRouter AI ---
OPENROUTER_API_KEY=sk-or-v1-REPLACE_WITH_YOUR_KEY
OPENROUTER_MODEL=anthropic/claude-3-haiku
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MAX_TOKENS=2000

# --- Application ---
APP_ENV=production
APP_PORT=8000
CORS_ORIGINS=http://localhost:3000
```

### .gitignore (Root)
```
.env
*.env.local
```
**NEVER commit `.env` to git.** Only commit `.env.example` with all values replaced by placeholder descriptions.

---

## Backend Dockerfile Strategy

### Multi-stage build:

**Stage 1 — builder:**
- Base: `python:3.12-slim`
- Install: `build-essential`, `libpq-dev` (for psycopg2)
- Run: `pip install --no-cache-dir -r requirements.txt`
- Output: compiled wheels in `/wheels`

**Stage 2 — runtime:**
- Base: `python:3.12-slim` (fresh, smaller)
- Copy: wheels from builder, install without build tools
- Copy: application code
- User: create non-root user `appuser`
- Entrypoint: shell script that runs migrations then starts server

**Entrypoint script (`entrypoint.sh`):**
```
1. Wait for DB connection (retry loop)
2. Run: alembic upgrade head
3. Run: python seed.py (create initial user if not exists)
4. Start: uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Frontend Dockerfile Strategy

### Multi-stage build:

**Stage 1 — builder:**
- Base: `node:20-alpine`
- Copy: `package.json`, `package-lock.json`
- Run: `npm ci` (clean install)
- Copy: source code
- Build arg: `VITE_API_BASE_URL` passed at build time
- Run: `npm run build` → outputs to `/app/dist`

**Stage 2 — nginx:**
- Base: `nginx:alpine`
- Copy: `/app/dist` → `/usr/share/nginx/html`
- Copy: `nginx.conf` → nginx config
- Expose: port 80

---

## nginx.conf (Frontend Container)

Key configuration:
```
server {
  listen 80;

  # SPA routing
  location / {
    root   /usr/share/nginx/html;
    index  index.html;
    try_files $uri $uri/ /index.html;
  }

  # API proxy — forward to backend container
  location /api/ {
    proxy_pass         http://backend:8000;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_read_timeout 120s;   # Extended for AI generation
    proxy_connect_timeout 10s;
  }

  # Health check endpoint for Docker
  location /nginx-health {
    return 200 'ok';
    add_header Content-Type text/plain;
  }
}
```

---

## Startup Order & Initialization

When running `docker compose up`:

```
1. postgres starts → runs health check until ready
2. redis starts → runs health check until ready
3. backend starts → waits for postgres healthy signal
   → entrypoint.sh runs alembic migrations
   → entrypoint.sh creates initial admin user (idempotent)
   → uvicorn starts on :8000
4. frontend starts → waits for backend (basic depends_on)
   → nginx serves on :80 (port 3000 on host)
```

First boot may take 30-60 seconds for migrations.

---

## Common Docker Commands

```bash
# Start full stack (production mode)
docker compose up -d

# Start with dev overrides
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop all services
docker compose down

# Stop and remove volumes (CAUTION: deletes all data)
docker compose down -v

# Rebuild after code changes
docker compose build backend
docker compose up -d --no-deps backend

# Run database migrations manually
docker compose exec backend alembic upgrade head

# Open psql shell
docker compose exec postgres psql -U financeapp -d finance_db

# Open Redis CLI
docker compose exec redis redis-cli
```

---

## Documents Folder Contents

### documents/README.md
- One-page project overview
- Tech stack summary table
- Quick start (3 commands to get running)
- Link to other docs

### documents/TECH_STACK.md
Full record of technology decisions:
- Why FastAPI over Django/Flask
- Why PostgreSQL over SQLite/MongoDB
- Why shadcn/ui + Tailwind
- Why OpenRouter (model flexibility)
- Why Redis for caching
- Decision rationale for each choice

### documents/API_REFERENCE.md
Complete API reference with:
- All endpoints listed
- Request body schema for each POST/PUT
- Response schema for each endpoint
- Example curl commands
- Error codes reference

### documents/DATABASE_SCHEMA.md
- All table definitions
- Column types and constraints
- Soft delete pattern explanation
- Index recommendations
- Entity relationship overview (text-based ERD)

### documents/ARCHITECTURE.md
- System architecture diagram (ASCII or Mermaid)
- Request flow for each major feature
- Caching strategy explanation
- AI analysis flow diagram

### documents/AI_INTEGRATION.md
- How to get OpenRouter API key (with steps)
- Supported models and cost comparison
- How to change the model used
- Token usage monitoring

### documents/SETUP_GUIDE.md
↓ See full content in next section

---

## SETUP_GUIDE.md — Human Integration Steps

This file must guide non-technical users through setup:

```markdown
# Setup Guide

## Prerequisites
- Docker Desktop installed and running
- Git installed

## Step 1: Clone the repository
git clone [repo-url]
cd [project-folder]

## Step 2: Create your environment file
Copy .env.example to .env:
  cp .env.example .env

Then edit .env and fill in:

### Required changes:
1. POSTGRES_PASSWORD → Change to a strong password
2. JWT_SECRET_KEY → Generate a random string (min 32 characters)
   You can generate one at: https://generate-secret.vercel.app/32
3. INITIAL_PASSWORD → Your login password for the app
4. OPENROUTER_API_KEY → Your OpenRouter API key (see AI_INTEGRATION.md)

### Optional changes:
- OPENROUTER_MODEL → Change AI model (default is claude-3-haiku, cheapest)
- JWT_EXPIRE_MINUTES → How long login session lasts (default 1440 = 24 hours)

## Step 3: Start the application
docker compose up -d

Wait about 60 seconds for first startup. You can monitor progress:
docker compose logs -f backend

When you see "Application startup complete" → app is ready.

## Step 4: Open the application
Open your browser and go to: http://localhost:3000

Login with:
- Username: value of INITIAL_USERNAME in .env (default: admin)
- Password: value of INITIAL_PASSWORD in .env

## Step 5: Change your password
After first login, go to Settings and change your password.

## Stopping the application
docker compose down

Your data is preserved in Docker volumes and will be available next time you run:
docker compose up -d

## Updating the application
git pull
docker compose build
docker compose up -d

## Backup your data
docker compose exec postgres pg_dump -U financeapp finance_db > backup_$(date +%Y%m%d).sql

## Restore from backup
docker compose exec -T postgres psql -U financeapp finance_db < backup_YYYYMMDD.sql
```

---

## Security Checklist

Before deploying or sharing access:
- [ ] `.env` is in `.gitignore` and never committed
- [ ] `POSTGRES_PASSWORD` is changed from default
- [ ] `JWT_SECRET_KEY` is a random 32+ character string
- [ ] `INITIAL_PASSWORD` is changed after first login
- [ ] OpenRouter API key has spending limits set on OpenRouter dashboard
- [ ] If exposing to internet: add HTTPS via reverse proxy (Nginx/Caddy with SSL)
- [ ] If exposing to internet: restrict `CORS_ORIGINS` to your domain only

---

## Troubleshooting

### Backend won't start
- Check: `docker compose logs backend`
- Common: DB not ready → wait 10s and retry, or check postgres logs
- Common: Missing env var → verify .env file exists and has all required values

### Frontend shows blank page / can't connect to API
- Check: `docker compose logs frontend`
- Check: backend is running → `docker compose ps`
- Check: nginx.conf proxy_pass URL matches backend service name

### AI analysis fails
- Check: OPENROUTER_API_KEY is set correctly in .env
- Check: OpenRouter dashboard → confirm API key is active and has credits
- The error message from backend will indicate if it's auth vs. rate limit vs. network

### Database migration errors
- Run manually: `docker compose exec backend alembic upgrade head`
- View migration history: `docker compose exec backend alembic history`
- Check: DATABASE_URL is correct in .env
