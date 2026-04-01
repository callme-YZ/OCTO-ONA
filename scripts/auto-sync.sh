#!/bin/bash
# ============================================
# OCTO-ONA Auto Sync Script
# ============================================
# Daily incremental sync for DMWork data
# Usage: ./scripts/auto-sync.sh [source_id]
# ============================================

set -e

# Configuration
SOURCE_ID="${1:-dmwork-octo}"
LOG_DIR="logs/sync"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/sync_${SOURCE_ID}_${TIMESTAMP}.log"
LOCK_FILE="/tmp/octo-ona-sync-${SOURCE_ID}.lock"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "${LOG_FILE}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "${LOG_FILE}"
}

# Create log directory
mkdir -p "${LOG_DIR}"

log "╔══════════════════════════════════════════════════════════╗"
log "║  OCTO-ONA Auto Sync                                      ║"
log "╚══════════════════════════════════════════════════════════╝"
log ""
log "Source ID: ${SOURCE_ID}"
log "Log file: ${LOG_FILE}"
log ""

# Check if another sync is running (lock file)
if [ -f "${LOCK_FILE}" ]; then
    PID=$(cat "${LOCK_FILE}")
    if ps -p "${PID}" > /dev/null 2>&1; then
        log_error "Another sync process is already running (PID: ${PID})"
        log_error "If this is a stale lock, remove: ${LOCK_FILE}"
        exit 1
    else
        log_warning "Stale lock file found, removing..."
        rm -f "${LOCK_FILE}"
    fi
fi

# Create lock file
echo $$ > "${LOCK_FILE}"

# Cleanup function
cleanup() {
    rm -f "${LOCK_FILE}"
}

trap cleanup EXIT INT TERM

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

cd "${PROJECT_ROOT}"

log "Project root: ${PROJECT_ROOT}"
log ""

# Step 1: Check database connection
log "━━━ Step 1: Database Health Check ━━━"
if mysql -u root -e "USE octo_ona; SELECT 1;" > /dev/null 2>&1; then
    log_success "Local database connection OK"
else
    log_error "Cannot connect to local database"
    exit 1
fi
log ""

# Step 2: Check last sync time
log "━━━ Step 2: Check Last Sync ━━━"
LAST_SYNC=$(mysql -u root octo_ona -N -e "SELECT last_sync_at FROM sync_status WHERE source_id='${SOURCE_ID}' ORDER BY last_sync_at DESC LIMIT 1;" 2>/dev/null || echo "")

if [ -n "${LAST_SYNC}" ]; then
    log "Last sync: ${LAST_SYNC}"
else
    log_warning "No previous sync found (first run)"
fi
log ""

# Step 3: Run incremental sync
log "━━━ Step 3: Incremental Sync ━━━"
log "Running: npx ts-node src/cli/index.ts sync ${SOURCE_ID} --verbose"
log ""

START_TIME=$(date +%s)

if npx ts-node src/cli/index.ts sync "${SOURCE_ID}" --verbose >> "${LOG_FILE}" 2>&1; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    log ""
    log_success "Sync completed in ${DURATION} seconds"
else
    log_error "Sync failed"
    exit 1
fi
log ""

# Step 4: Update sync status
log "━━━ Step 4: Update Sync Status ━━━"
CURRENT_TIME=$(date -u +"%Y-%m-%d %H:%M:%S")

mysql -u root octo_ona << SQL >> "${LOG_FILE}" 2>&1
INSERT INTO sync_status (source_id, last_sync_at, status, message)
VALUES ('${SOURCE_ID}', '${CURRENT_TIME}', 'success', 'Auto sync completed')
ON DUPLICATE KEY UPDATE 
    last_sync_at = '${CURRENT_TIME}',
    status = 'success',
    message = 'Auto sync completed',
    updated_at = CURRENT_TIMESTAMP;
SQL

log_success "Sync status updated"
log ""

# Step 5: Collect statistics
log "━━━ Step 5: Statistics ━━━"

STATS=$(mysql -u root octo_ona -N << 'SQL'
SELECT CONCAT(
    'Users: ', (SELECT COUNT(*) FROM users WHERE source_id LIKE 'dmwork%'),
    ' | Bots: ', (SELECT COUNT(*) FROM users WHERE is_bot=1 AND source_id LIKE 'dmwork%'),
    ' | Messages: ', (SELECT COUNT(*) FROM messages WHERE source_id LIKE 'dmwork%'),
    ' | Channels: ', (SELECT COUNT(*) FROM channels WHERE source_id LIKE 'dmwork%')
);
SQL
)

log "${STATS}"
log ""

# Step 6: Log rotation (keep last 30 days)
log "━━━ Step 6: Log Rotation ━━━"
find "${LOG_DIR}" -name "sync_*.log" -mtime +30 -delete 2>/dev/null && \
    log "Old logs cleaned (>30 days)" || \
    log "No old logs to clean"
log ""

log "╔══════════════════════════════════════════════════════════╗"
log "║  Auto Sync Complete                                      ║"
log "╚══════════════════════════════════════════════════════════╝"

exit 0
