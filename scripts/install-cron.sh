#!/bin/bash
# ============================================
# Install Cron Job for Auto Sync
# ============================================
# This script installs a cron job for daily auto sync
# Usage: ./scripts/install-cron.sh
# ============================================

set -e

# Configuration
CRON_TIME="${CRON_TIME:-0 3 * * *}"  # Default: 3:00 AM daily
SOURCE_ID="${SOURCE_ID:-dmwork-octo}"

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
AUTO_SYNC_SCRIPT="${PROJECT_ROOT}/scripts/auto-sync.sh"
CRON_LOG="${PROJECT_ROOT}/logs/sync/cron.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Install Cron Job for OCTO-ONA Auto Sync                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if script exists
if [ ! -f "${AUTO_SYNC_SCRIPT}" ]; then
    echo -e "${RED}Error: auto-sync.sh not found at ${AUTO_SYNC_SCRIPT}${NC}"
    exit 1
fi

# Check if script is executable
if [ ! -x "${AUTO_SYNC_SCRIPT}" ]; then
    echo -e "${YELLOW}Warning: auto-sync.sh is not executable, fixing...${NC}"
    chmod +x "${AUTO_SYNC_SCRIPT}"
fi

# Create log directory
mkdir -p "$(dirname "${CRON_LOG}")"

echo "Configuration:"
echo "  Project root: ${PROJECT_ROOT}"
echo "  Auto sync script: ${AUTO_SYNC_SCRIPT}"
echo "  Cron schedule: ${CRON_TIME}"
echo "  Source ID: ${SOURCE_ID}"
echo "  Cron log: ${CRON_LOG}"
echo ""

# Construct cron job entry
CRON_JOB="${CRON_TIME} cd ${PROJECT_ROOT} && ${AUTO_SYNC_SCRIPT} ${SOURCE_ID} >> ${CRON_LOG} 2>&1"

echo "Cron job to install:"
echo "  ${CRON_JOB}"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -F "${AUTO_SYNC_SCRIPT}" > /dev/null; then
    echo -e "${YELLOW}Warning: A cron job for auto-sync.sh already exists${NC}"
    echo ""
    echo "Existing cron jobs:"
    crontab -l 2>/dev/null | grep -F "${AUTO_SYNC_SCRIPT}" || true
    echo ""
    read -p "Do you want to replace it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled"
        exit 0
    fi
    
    # Remove existing cron job
    crontab -l 2>/dev/null | grep -v -F "${AUTO_SYNC_SCRIPT}" | crontab -
    echo "Existing cron job removed"
fi

# Install new cron job
(crontab -l 2>/dev/null; echo "${CRON_JOB}") | crontab -

echo -e "${GREEN}✅ Cron job installed successfully${NC}"
echo ""

# Verify installation
echo "Verification:"
if crontab -l 2>/dev/null | grep -F "${AUTO_SYNC_SCRIPT}" > /dev/null; then
    echo -e "${GREEN}✅ Cron job is active${NC}"
    echo ""
    echo "Installed cron job:"
    crontab -l 2>/dev/null | grep -F "${AUTO_SYNC_SCRIPT}"
else
    echo -e "${RED}❌ Cron job installation failed${NC}"
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Installation Complete                                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Verify cron is running: crontab -l"
echo "  2. Monitor logs: tail -f ${CRON_LOG}"
echo "  3. First sync will run at: ${CRON_TIME}"
echo ""
echo "To uninstall:"
echo "  ./scripts/uninstall-cron.sh"
echo ""
