#!/usr/bin/env sh
set -e

STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="${BACKUP_DIR}/mariadb_${STAMP}.sql.gz"
RETENTION="${BACKUP_RETENTION:-7}"

echo "[$(date)] Starting MariaDB backup → ${BACKUP_FILE}"

mysqldump \
  -h "${MYSQL_HOST}" \
  -u "${MYSQL_USER}" \
  -p"${MYSQL_PASSWORD}" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --flush-logs \
  "${MYSQL_DATABASE}" \
| gzip -9 > "${BACKUP_FILE}"

echo "[$(date)] Backup complete. Pruning files older than ${RETENTION} days…"
find "${BACKUP_DIR}" -name "mariadb_*.sql.gz" -mtime "+${RETENTION}" -delete

echo "[$(date)] Done."
