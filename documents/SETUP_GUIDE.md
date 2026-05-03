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
Run the full stack in detached mode:
```bash
docker compose up -d
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
