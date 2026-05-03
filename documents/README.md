# Personal Finance Management

A comprehensive full-stack application for managing personal finances, tracking expenses/income, and generating AI-powered financial insights.

## Project Overview
This system provides a modern, responsive interface for users to keep their financial life in order. With integrated AI analysis, users can get personalized advice and summaries of their spending habits.

## Tech Stack Summary
| Layer | Technology |
|---|---|
| **Frontend** | React, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | FastAPI (Python 3.12), SQLAlchemy, Alembic |
| **Database** | PostgreSQL 16 |
| **Cache/Queue** | Redis 7 |
| **Orchestration** | Docker Compose |
| **AI Integration** | OpenRouter (Claude/GPT) |

## Quick Start
1. **Initialize Environment**:
   ```bash
   cp .env.example .env
   # Edit .env and fill in required keys
   ```
2. **Launch Stack**:
   ```bash
   docker compose up -d
   ```
3. **Access App**:
   Open [http://localhost:3000](http://localhost:3000)

## Detailed Documentation
- [Setup Guide](./SETUP_GUIDE.md) - Step-by-step installation
- [API Reference](./API_REFERENCE.md) - Backend endpoint documentation
- [Database Schema](./DATABASE_SCHEMA.md) - ERD and table definitions
- [Architecture](./ARCHITECTURE.md) - System design and data flow
- [AI Integration](./AI_INTEGRATION.md) - Configuring OpenRouter
- [Tech Stack Details](./TECH_STACK.md) - Rationale behind technology choices
