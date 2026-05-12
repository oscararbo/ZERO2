#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
SCHEDULE="*/5 * * * *"

CRON_LINE="$SCHEDULE cd $BACKEND_DIR && $PYTHON_BIN manage.py run_async_jobs --limit 20 >> $BACKEND_DIR/job_worker.log 2>&1"

( crontab -l 2>/dev/null; echo "$CRON_LINE" ) | crontab -

echo "Installed cron job:"
echo "$CRON_LINE"
