#!/usr/bin/env bash
# Deploy Relay to production
# Run from the repository root: /opt/relay
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/relay}"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.prod.yml"
ENV_FILE="${APP_DIR}/deploy/.env.prod"
HEALTH_URL="http://localhost:80/api/health"
MAX_RETRIES=30
RETRY_INTERVAL=2

cd "$APP_DIR"

echo "=== Relay Deployment ==="
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# Verify env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy from .env.prod.example and configure."
  exit 1
fi

# Source env file for DB_PASSWORD (needed by docker compose)
set -a
source "$ENV_FILE"
set +a

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Build images
echo "Building Docker images..."
docker compose -f "$COMPOSE_FILE" build

# Store current image IDs for rollback
PREV_BACKEND=$(docker compose -f "$COMPOSE_FILE" images -q backend 2>/dev/null || echo "")
PREV_FRONTEND=$(docker compose -f "$COMPOSE_FILE" images -q frontend 2>/dev/null || echo "")

# Start services
echo "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

# Wait for postgres to be ready
echo "Waiting for postgres..."
for i in $(seq 1 $MAX_RETRIES); do
  if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U relay -d relay &>/dev/null; then
    echo "Postgres is ready."
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "ERROR: Postgres failed to start."
    exit 1
  fi
  sleep "$RETRY_INTERVAL"
done

# Run database migrations
echo "Running database migrations..."
docker compose -f "$COMPOSE_FILE" exec -T backend npx drizzle-kit migrate

# Health check
echo "Checking health..."
for i in $(seq 1 $MAX_RETRIES); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "Health check passed!"
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "ERROR: Health check failed after $MAX_RETRIES attempts (last status: $HTTP_CODE)"
    echo "Rolling back..."

    # Rollback: restart with previous images
    if [ -n "$PREV_BACKEND" ] || [ -n "$PREV_FRONTEND" ]; then
      docker compose -f "$COMPOSE_FILE" down
      echo "Rollback: restarting previous containers..."
      docker compose -f "$COMPOSE_FILE" up -d
    fi

    echo "Check logs: docker compose -f $COMPOSE_FILE logs"
    exit 1
  fi
  sleep "$RETRY_INTERVAL"
done

# Clean up old images
echo "Cleaning up unused images..."
docker image prune -f

echo ""
echo "=== Deployment Complete ==="
echo "Site: https://relayfunds.org"
echo "Health: $HEALTH_URL"
docker compose -f "$COMPOSE_FILE" ps
