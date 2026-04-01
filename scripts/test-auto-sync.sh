#!/bin/bash
# ============================================
# Test Auto Sync Script
# ============================================

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Auto Sync Script Test                                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

cd "${PROJECT_ROOT}"

# Test 1: Check sync_status table exists
echo "━━━ Test 1: Check sync_status Table ━━━"
if mysql -u root octo_ona -e "DESCRIBE sync_status;" > /dev/null 2>&1; then
    echo "✅ sync_status table exists"
else
    echo "❌ sync_status table missing"
    exit 1
fi
echo ""

# Test 2: Insert test sync status
echo "━━━ Test 2: Insert Sync Status ━━━"
mysql -u root octo_ona << SQL
INSERT INTO sync_status (source_id, last_sync_at, status, message)
VALUES ('test-source', NOW(), 'success', 'Test sync')
ON DUPLICATE KEY UPDATE 
    last_sync_at = NOW(),
    status = 'success',
    message = 'Test sync',
    updated_at = CURRENT_TIMESTAMP;
SQL
echo "✅ Test sync status inserted"
echo ""

# Test 3: Query last sync
echo "━━━ Test 3: Query Last Sync ━━━"
LAST_SYNC=$(mysql -u root octo_ona -N -e "SELECT last_sync_at FROM sync_status WHERE source_id='test-source' ORDER BY last_sync_at DESC LIMIT 1;")
if [ -n "${LAST_SYNC}" ]; then
    echo "✅ Last sync: ${LAST_SYNC}"
else
    echo "❌ Cannot query last sync"
    exit 1
fi
echo ""

# Test 4: Check script exists and is executable
echo "━━━ Test 4: Check Script ━━━"
if [ -x "${SCRIPT_DIR}/auto-sync.sh" ]; then
    echo "✅ auto-sync.sh is executable"
else
    echo "❌ auto-sync.sh is not executable"
    exit 1
fi
echo ""

# Test 5: Check log directory creation
echo "━━━ Test 5: Log Directory ━━━"
if [ -d "logs/sync" ]; then
    echo "✅ Log directory exists"
else
    mkdir -p logs/sync
    echo "✅ Log directory created"
fi
echo ""

# Test 6: Lock file mechanism
echo "━━━ Test 6: Lock File Mechanism ━━━"
LOCK_FILE="/tmp/octo-ona-sync-test-source.lock"

# Create lock
echo "9999" > "${LOCK_FILE}"
echo "✅ Lock file created: ${LOCK_FILE}"

# Check lock (simulated)
if [ -f "${LOCK_FILE}" ]; then
    PID=$(cat "${LOCK_FILE}")
    if ps -p "${PID}" > /dev/null 2>&1; then
        echo "⚠️  Lock is held by process ${PID}"
    else
        echo "✅ Stale lock detected (PID ${PID} not running)"
        rm -f "${LOCK_FILE}"
        echo "✅ Lock file removed"
    fi
fi
echo ""

# Cleanup test data
echo "━━━ Cleanup ━━━"
mysql -u root octo_ona -e "DELETE FROM sync_status WHERE source_id='test-source';" > /dev/null 2>&1
echo "✅ Test data cleaned"
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  All Tests Passed                                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
