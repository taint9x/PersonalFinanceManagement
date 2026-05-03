#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Waiting for postgres..."

while ! nc -z $POSTGRES_HOST $POSTGRES_PORT; do
  sleep 0.1
done

echo "PostgreSQL started"

# Run migrations
echo "Running database migrations..."
alembic upgrade head

# Seed the database
echo "Seeding the database..."
python seed.py

# Start the application
echo "Starting the application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
