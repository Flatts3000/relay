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

# Dump and compress
echo "Dumping database..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U relay -d relay --no-owner --no-privileges \
  | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
echo "Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Sanity-check the dump before it is uploaded and before retention deletes an
# older, good one.
#
# pg_dump exiting 0 does not mean it produced a usable backup: a partial dump, a
# permissions problem mid-stream, or a disk that filled can all yield a small
# file and a clean exit. Every dump this job has ever produced was ~3.3 KB, and
# nothing would have noticed if that had silently become 300 bytes - the size
# never varied, so nobody had a baseline to compare against.
#
# Checked semantically rather than by size alone: a dump that does not define
# the expected tables is not a backup of this database, whatever it weighs.
BACKUP_BYTES=$(stat -c %s "${BACKUP_DIR}/${BACKUP_FILE}")
TABLE_COUNT=$(gunzip -c "${BACKUP_DIR}/${BACKUP_FILE}" | grep -c '^CREATE TABLE' || true)

if [ "$BACKUP_BYTES" -lt "$MIN_BACKUP_BYTES" ]; then
  echo "ERROR: backup is ${BACKUP_BYTES} bytes, below the ${MIN_BACKUP_BYTES} byte floor."
  echo "Refusing to upload. The previous backup is left in place."
  rm -f "${BACKUP_DIR}/${BACKUP_FILE}"
  exit 1
fi

if [ "$TABLE_COUNT" -lt "$MIN_TABLE_COUNT" ]; then
  echo "ERROR: backup defines ${TABLE_COUNT} tables, fewer than the expected minimum of ${MIN_TABLE_COUNT}."
  echo "Refusing to upload. The previous backup is left in place."
  rm -f "${BACKUP_DIR}/${BACKUP_FILE}"
  exit 1
fi

echo "Sanity check passed: ${BACKUP_BYTES} bytes, ${TABLE_COUNT} tables."

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
