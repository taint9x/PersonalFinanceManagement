# Personal Finance Management

A comprehensive full-stack application for managing personal finances, tracking expenses/income, and generating AI-powered financial insights.

## Project Overview
This system provides a modern, responsive interface for users to keep their financial life in order. With integrated AI analysis, users can get personalized advice and summaries of their spending habits.

## Features
- **Dashboard**: Monthly cashflow overview with charts and trend analysis
- **Tổng Quan Tháng**: Xem toàn bộ thu chi nợ trong 1 tab, mark đã thanh toán/chi
- **Xuất Excel**: Xuất báo cáo tháng dưới dạng file Excel (4 sheet)
- **Báo cáo tự động**: Tự động gửi báo cáo cuối tháng qua Email và Telegram
- **Debt Tracking**: Manage loans, credit cards, and installment payments
- **Expense Management**: Track recurring and one-time expenses
- **Income Tracking**: Log salaries, freelance, and passive income
- **AI Analysis**: Get personalized monthly financial advice via OpenRouter

## Tech Stack Summary
| Layer | Technology |
|---|---|
| **Frontend** | React, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | FastAPI (Python 3.12), SQLAlchemy, Alembic |
| **Database** | PostgreSQL 16 |
| **Cache/Queue** | Redis 7 |
| **Orchestration** | Docker Compose |
| **AI Integration** | OpenRouter (Claude/GPT) |
| **Excel Export** | openpyxl (server-side) |
| **Email** | aiosmtplib + Jinja2 |
| **Scheduler** | APScheduler (in-process cron) |

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
- [Email Setup](./EMAIL_SETUP.md) - Configure SMTP for monthly reports
- [Telegram Setup](./TELEGRAM_SETUP.md) - Configure Telegram bot for monthly reports
- [Migration Manual](./MIGRATION_MANUAL.md) - DB migrations 011 & 012 run/rollback guide
