#!/usr/bin/env bash
# Daily database backup for Relay
# Dumps postgres, compresses, uploads to S3, prunes old backups
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/relay}"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.prod.yml"
BACKUP_DIR="${APP_DIR}/backups"
TIMESTAMP=$(date -u '+%Y%m%d_%H%M%S')
BACKUP_FILE="relay_${TIMESTAMP}.sql.gz"
LOCAL_RETENTION_DAYS=30
S3_RETENTION_DAYS=90

# Floors for the sanity check below. Deliberately well under the real values
# (a healthy dump is a few KB and defines 17 tables) so ordinary growth or a
# dropped table does not cause a false alarm - these catch a dump that is
# broken, not one that is merely different.
MIN_BACKUP_BYTES=1000
MIN_TABLE_COUNT=10

# Source env for S3 bucket name and DB_PASSWORD
set -a
source "${APP_DIR}/deploy/.env.prod"
set +a

S3_BUCKET="${S3_BACKUP_BUCKET:-relay-backups-prod}"

echo "=== Database Backup: $TIMESTAMP ==="

# Create backup directory if needed
mkdir -p "$BACKUP_DIR"

# Dump and compress.
#
# Written to a .tmp name and only renamed into place once it has passed the
# checks below. The redirection truncates its target before the pipeline runs,
# so under `set -euo pipefail` a pg_dump failure aborts the script with a
# partial or empty file already on disk - and if that file carried the real
# name, it would become the newest relay_*.sql.gz and be picked up first by any
# `ls -t` restore. The trap covers the abort case.
echo "Dumping database..."
TMP_FILE="${BACKUP_DIR}/${BACKUP_FILE}.tmp"
trap 'rm -f "$TMP_FILE"' EXIT

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U relay -d relay --no-owner --no-privileges --clean --if-exists \
  | gzip > "$TMP_FILE"

# Sanity-check before uploading, and before retention later deletes an older,
# good backup on the assumption this one replaced it.
#
# pg_dump exiting 0 does not mean it produced a usable backup: a partial dump, a
# permissions problem mid-stream, or a disk that filled can all yield a file and
# a clean exit. Every dump this job produced was the same ~3.3 KB, so there was
# no baseline against which a silent truncation would have stood out.
#
# Three checks, because each catches something the others miss:
#
#   1. gzip integrity. This is the one that catches truncation. pg_dump writes
#      the schema at the head of the stream and the COPY data at the tail, so a
#      dump cut short mid-data still contains every CREATE TABLE line and is
#      comfortably over any byte floor - it passes checks 2 and 3 while being
#      unrestorable. Only the CRC knows.
#   2. Size floor, for the grossly-empty case.
#   3. Table count, because a file that does not define this database's tables
#      is not a backup of it, whatever it weighs.
if ! gunzip -t "$TMP_FILE" 2>/dev/null; then
  echo "ERROR: backup failed gzip integrity check - the dump is truncated or corrupt."
  mv "$TMP_FILE" "${BACKUP_DIR}/${BACKUP_FILE}.rejected"
  trap - EXIT
  echo "Kept as ${BACKUP_FILE}.rejected for diagnosis. Previous backup left in place."
  exit 1
fi

BACKUP_BYTES=$(stat -c %s "$TMP_FILE")
TABLE_COUNT=$(gunzip -c "$TMP_FILE" | grep -c '^CREATE TABLE' || true)

if [ "$BACKUP_BYTES" -lt "$MIN_BACKUP_BYTES" ] || [ "$TABLE_COUNT" -lt "$MIN_TABLE_COUNT" ]; then
  echo "ERROR: backup is ${BACKUP_BYTES} bytes with ${TABLE_COUNT} tables."
  echo "Expected at least ${MIN_BACKUP_BYTES} bytes and ${MIN_TABLE_COUNT} tables."
  mv "$TMP_FILE" "${BACKUP_DIR}/${BACKUP_FILE}.rejected"
  trap - EXIT
  echo "Kept as ${BACKUP_FILE}.rejected for diagnosis. Previous backup left in place."
  exit 1
fi

# Rejected dumps are kept for diagnosis but must never be restored from or
# uploaded, so they deliberately do not match the relay_*.sql.gz glob used by
# the prune steps and by the restore procedure in docs/deployment.md.
mv "$TMP_FILE" "${BACKUP_DIR}/${BACKUP_FILE}"
trap - EXIT

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
echo "Backup created: ${BACKUP_FILE} (${BACKUP_SIZE}), ${TABLE_COUNT} tables, integrity OK."

# Upload to S3
if command -v aws &>/dev/null && [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
  echo "Uploading to s3://${S3_BUCKET}/..."
  aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://${S3_BUCKET}/${BACKUP_FILE}" \
    --storage-class STANDARD_IA

  # Prune old S3 backups (older than retention period)
  echo "Pruning S3 backups older than ${S3_RETENTION_DAYS} days..."
  CUTOFF_DATE=$(date -u -d "${S3_RETENTION_DAYS} days ago" '+%Y-%m-%d' 2>/dev/null || \
                date -u -v-${S3_RETENTION_DAYS}d '+%Y-%m-%d' 2>/dev/null || echo "")
  if [ -n "$CUTOFF_DATE" ]; then
    aws s3api list-objects-v2 --bucket "$S3_BUCKET" --query "Contents[?LastModified<'${CUTOFF_DATE}'].Key" --output text \
      | tr '\t' '\n' \
      | while read -r key; do
          if [ -n "$key" ] && [ "$key" != "None" ]; then
            echo "  Deleting old backup: $key"
            aws s3 rm "s3://${S3_BUCKET}/${key}"
          fi
        done
  fi

  echo "S3 upload complete."
else
  echo "WARNING: AWS CLI not configured. Backup saved locally only."
fi

# Prune old local backups
echo "Pruning local backups older than ${LOCAL_RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "relay_*.sql.gz" -mtime "+${LOCAL_RETENTION_DAYS}" -delete

echo "=== Backup Complete ==="
