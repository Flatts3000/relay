#!/usr/bin/env bash
# Deploy Relay to production
# Run from the repository root: /opt/relay
set -euo pipefail

# Absolute path to this script, resolved before the cd below so the re-exec
# further down works however the script was invoked. `exec "$0"` is not enough:
# when called as ./deploy.sh, $0 stays relative, and by the time the re-exec
# runs the working directory has changed to APP_DIR, so exec cannot find it.
SELF_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

APP_DIR="${APP_DIR:-/opt/relay}"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.prod.yml"
ENV_FILE="${APP_DIR}/deploy/.env.prod"
# Readiness, not liveness. This gate is what triggers the rollback below, so
# checking an endpoint that answers 200 whenever the process is up meant a
# deploy with a broken database config passed and was never rolled back.
#
# Addressed to the site Caddy actually serves, over HTTPS, resolved to the
# loopback so no traffic leaves the box. Plain http://localhost:80 does not
# work and never did: Caddy answers it with a 308 redirect to HTTPS, so the
# gate could only ever see 308, fail all 30 attempts, and take the rollback
# path on a perfectly good deploy. Verified on the host - all three of
# /api/health, /api/health/ready and a Host-header variant returned 308.
# -k because the certificate is for relayfunds.org and we are dialling 127.0.0.1.
HEALTH_URL="https://relayfunds.org/api/health/ready"
CURL_OPTS=(-sk --max-time 10 --resolve "relayfunds.org:443:127.0.0.1")
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

# Pull latest code.
#
# Then hand off to the version we just pulled, if this file was one of the
# things that changed.
#
# bash reads a script incrementally rather than loading it whole, so a running
# deploy that pulls a new deploy.sh carries on executing the copy it had already
# read. A change to this file would otherwise take effect on the deploy *after*
# the one that ships it - which happened on 2026-08-29, when a fixed health
# gate was pulled onto the host and the deploy then failed using the old one.
#
# The subtler risk is worse than the delay: if the pull changes the file's byte
# length, bash can resume at an offset landing mid-token in the new content.
#
# The env var makes this at most a single hand-off, so a pull that somehow
# always reports a change cannot loop.
echo "Pulling latest code..."
SELF_BEFORE=$(sha256sum "$SELF_PATH" | cut -d' ' -f1)
git pull origin main
SELF_AFTER=$(sha256sum "$SELF_PATH" | cut -d' ' -f1)

if [ "$SELF_BEFORE" != "$SELF_AFTER" ] && [ -z "${RELAY_DEPLOY_REEXEC:-}" ]; then
  echo "deploy.sh changed in this pull - re-executing the new version."
  export RELAY_DEPLOY_REEXEC=1
  exec "$SELF_PATH" "$@"
fi

# Build images
echo "Building Docker images..."
docker compose -f "$COMPOSE_FILE" build

# Store current image IDs for rollback
PREV_BACKEND=$(docker compose -f "$COMPOSE_FILE" images -q backend 2>/dev/null || echo "")
PREV_FRONTEND=$(docker compose -f "$COMPOSE_FILE" images -q frontend 2>/dev/null || echo "")

# Database first, and migrations before anything starts serving.
#
# The old order was: recreate every container, then migrate. A migration
# failure therefore left the new code already running against the old schema,
# and because the health gate below sits after this step, neither the gate nor
# the rollback it triggers was reachable for this class of failure. That is not
# hypothetical - it is what every deploy did from 2026-08-29 (#64).
#
# Bringing up only postgres keeps the previous backend and frontend serving
# while the schema moves. If the migration fails, set -e aborts here with the
# old, working containers untouched.
echo "Starting database..."
docker compose -f "$COMPOSE_FILE" up -d postgres

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

# A one-off container from the image just built, so the migration runs the same
# code the new server will. --no-deps because postgres is already up.
echo "Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm --no-deps backend node dist/migrate.js

# Start the rest
echo "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

# Health check
echo "Checking health..."
for i in $(seq 1 $MAX_RETRIES); do
  HTTP_CODE=$(curl "${CURL_OPTS[@]}" -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
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
