#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT="/var/backups/catv"
PROJECT_DIR="/var/www/catv-ui"
ENV_FILE="/var/www/catv-ui/server/.env"
RCLONE_REMOTE="gdrive:catv-server"
RETENTION_DAYS=7

mkdir -p "$BACKUP_ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

read -r DB_USER DB_PASS DB_HOST DB_PORT DB_NAME < <(
  node -e "const u=new URL(process.env.DATABASE_URL);const db=u.pathname.replace(/^\//,'');const user=decodeURIComponent(u.username);const pass=decodeURIComponent(u.password);console.log([user,pass,u.hostname,u.port||'3306',db].join(' '));"
)

if [[ -z "$DB_NAME" || -z "$DB_USER" || -z "$DB_HOST" ]]; then
  echo "Failed to parse DATABASE_URL" >&2
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M")
ARCHIVE="$BACKUP_ROOT/catv-backup-$TIMESTAMP.tar.gz"
TMP_DIR=$(mktemp -d)
CNF_FILE="$TMP_DIR/mysql.cnf"

ESC_USER=${DB_USER//\\/\\\\}
ESC_USER=${ESC_USER//"/\\"}
ESC_PASS=${DB_PASS//\\/\\\\}
ESC_PASS=${ESC_PASS//"/\\"}
ESC_HOST=${DB_HOST//\\/\\\\}
ESC_HOST=${ESC_HOST//"/\\"}

cat > "$CNF_FILE" <<EOF
[client]
user="$ESC_USER"
password="$ESC_PASS"
host="$ESC_HOST"
port=$DB_PORT
EOF
chmod 600 "$CNF_FILE"

mysqldump --defaults-extra-file="$CNF_FILE" --single-transaction --routines --triggers "$DB_NAME" > "$TMP_DIR/db.sql"

tar -czf "$ARCHIVE" \
  --exclude="node_modules" \
  --exclude="server/node_modules" \
  --exclude="dist" \
  -C "$PROJECT_DIR" . \
  -C "$TMP_DIR" db.sql

rclone mkdir "$RCLONE_REMOTE"
rclone copy "$ARCHIVE" "$RCLONE_REMOTE"

find "$BACKUP_ROOT" -type f -name "catv-backup-*.tar.gz" -mtime +"$RETENTION_DAYS" -delete
rclone delete "$RCLONE_REMOTE" --min-age "${RETENTION_DAYS}d" --include "catv-backup-*.tar.gz"

rm -rf "$TMP_DIR"

echo "Backup completed: $ARCHIVE"