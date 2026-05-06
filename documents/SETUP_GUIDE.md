# Setup Guide

Follow these steps to get the Personal Finance Management system running on your local machine.

## Prerequisites
- **Docker Desktop**: Installed and running.
- **Git**: Installed for repository management.

## Step 1: Clone the Repository
```bash
git clone [your-repo-url]
cd PersonalFinanceManagement
```

## Step 2: Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` in a text editor and fill in the following:
1. **`POSTGRES_PASSWORD`**: Set a strong password for your database.
2. **`JWT_SECRET_KEY`**: Generate a random 32+ character string.
3. **`OPENROUTER_API_KEY`**: Your API key from [OpenRouter](https://openrouter.ai/).
4. **`INITIAL_PASSWORD`**: The password you will use for your first login.

## Step 3: Start the Application

unset POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB POSTGRES_HOST POSTGRES_PORT DATABASE_URL REDIS_HOST REDIS_PORT REDIS_URL APP_ENV APP_PORT CORS_ORIGINS JWT_SECRET_KEY JWT_ALGORITHM JWT_EXPIRE_MINUTES OPENROUTER_API_KEY OPENROUTER_MODEL OPENROUTER_BASE_URL OPENROUTER_MAX_TOKENS SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD SMTP_FROM REPORT_TO_EMAIL TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID SCHEDULER_ENABLED SCHEDULER_TIMEZONE INITIAL_USERNAME INITIAL_PASSWORD


Run the full stack in detached mode:
```bash
docker compose -f docker-compose.yml -p prod_personalfinance up -d --build
```

*DEV*
```bash
docker compose -f docker-compose.dev.yml -p dev_personalfinance up -d --build
```

The first startup will take about 60-90 seconds as it builds images and runs initial migrations.

## Step 4: Verify Status
Check if everything is running:
```bash
docker compose ps
```
You can also follow the logs to see the startup progress:
```bash
docker compose logs -f backend
```
Look for `Application startup complete`.

## Step 5: Access the System
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs) (requires dev mode)

**Login Details**:
- **Username**: `admin` (or whatever `INITIAL_USERNAME` is set to)
- **Password**: Your `INITIAL_PASSWORD` from `.env`.

## Common Troubleshooting
- **Port Conflict**: If port 3000 or 8000 is taken, change the host port in `docker-compose.yml`.
- **DB Connection**: Ensure Docker has enough memory/disk space for the Postgres volume.
- **AI Fails**: Verify your OpenRouter key has credits and the model name is correct.

## Step 6: Setup Email Notifications (Optional)
See [documents/EMAIL_SETUP.md](./EMAIL_SETUP.md) for detailed instructions.

After updating `.env` with your SMTP credentials, restart the backend:
```bash
docker compose restart backend
```

## Step 7: Setup Telegram Notifications (Optional)
See [documents/TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) for detailed instructions.

After updating `.env` with your bot token and chat ID, restart the backend:
```bash
docker compose restart backend
```

## Disabling the Scheduler
If you don't want automatic monthly reports sent at end of month:
```bash
# In your .env file:
SCHEDULER_ENABLED=false
```
Manual sending via the app UI (Lịch Sử Báo Cáo → Gửi Thủ Công) still works regardless of this setting.
