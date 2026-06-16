#!/usr/bin/env sh
set -e

HOST="${QDRANT_HOST:-qdrant}"
PORT="${QDRANT_PORT:-6333}"
RETENTION="${BACKUP_RETENTION:-7}"
STAMP=$(date +%Y%m%d_%H%M%S)

echo "[$(date)] Creating Qdrant full snapshot…"

# List collections and snapshot each one
COLLECTIONS=$(curl -sf "http://${HOST}:${PORT}/collections" | \
  sed 's/,/\n/g' | grep '"name"' | sed 's/.*"name":"\([^"]*\)".*/\1/')

for COLL in $COLLECTIONS; do
  echo "  Snapshotting collection: ${COLL}"
  curl -sf -X POST "http://${HOST}:${PORT}/collections/${COLL}/snapshots" \
    -H "Content-Type: application/json" > /dev/null
done

# Prune snapshots older than retention days
find /snapshots -name "*.snapshot" -mtime "+${RETENTION}" -delete 2>/dev/null || true

echo "[$(date)] Qdrant backup done."
