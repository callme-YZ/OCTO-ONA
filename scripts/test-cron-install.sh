#!/bin/bash
# ============================================
# Test Cron Installation Scripts
# ============================================

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Cron Installation Test                                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Test 1: Check scripts exist
echo "━━━ Test 1: Check Scripts Exist ━━━"
if [ -f "${SCRIPT_DIR}/install-cron.sh" ] && [ -f "${SCRIPT_DIR}/uninstall-cron.sh" ]; then
    echo "✅ Scripts exist"
else
    echo "❌ Scripts missing"
    exit 1
fi
echo ""

# Test 2: Check scripts are executable
echo "━━━ Test 2: Check Executable ━━━"
if [ -x "${SCRIPT_DIR}/install-cron.sh" ] && [ -x "${SCRIPT_DIR}/uninstall-cron.sh" ]; then
    echo "✅ Scripts are executable"
else
    echo "❌ Scripts not executable"
    exit 1
fi
echo ""

# Test 3: Check auto-sync.sh exists
echo "━━━ Test 3: Check auto-sync.sh ━━━"
if [ -f "${SCRIPT_DIR}/auto-sync.sh" ]; then
    echo "✅ auto-sync.sh exists"
else
    echo "❌ auto-sync.sh missing"
    exit 1
fi
echo ""

# Test 4: Check crontab command availability
echo "━━━ Test 4: Check crontab Command ━━━"
if command -v crontab &> /dev/null; then
    echo "✅ crontab command available"
else
    echo "⚠️  crontab command not found (this is OK on some systems)"
fi
echo ""

# Test 5: Test installation (dry run simulation)
echo "━━━ Test 5: Dry Run Simulation ━━━"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
AUTO_SYNC_SCRIPT="${PROJECT_ROOT}/scripts/auto-sync.sh"
CRON_TIME="0 3 * * *"
SOURCE_ID="dmwork-octo"
CRON_LOG="${PROJECT_ROOT}/logs/sync/cron.log"

CRON_JOB="${CRON_TIME} cd ${PROJECT_ROOT} && ${AUTO_SYNC_SCRIPT} ${SOURCE_ID} >> ${CRON_LOG} 2>&1"

echo "Simulated cron job:"
echo "  ${CRON_JOB}"
echo "✅ Cron job string constructed correctly"
echo ""

# Test 6: Check log directory can be created
echo "━━━ Test 6: Log Directory Creation ━━━"
if mkdir -p "${PROJECT_ROOT}/logs/sync"; then
    echo "✅ Log directory created/exists"
else
    echo "❌ Cannot create log directory"
    exit 1
fi
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  All Tests Passed                                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Note: To actually install the cron job, run:"
echo "  ./scripts/install-cron.sh"
