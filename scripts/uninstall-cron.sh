#!/bin/bash
# ============================================
# Uninstall Cron Job for Auto Sync
# ============================================
# This script removes the cron job for auto sync
# Usage: ./scripts/uninstall-cron.sh
# ============================================

set -e

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
AUTO_SYNC_SCRIPT="${PROJECT_ROOT}/scripts/auto-sync.sh"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Uninstall Cron Job for OCTO-ONA Auto Sync              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if cron job exists
if crontab -l 2>/dev/null | grep -F "${AUTO_SYNC_SCRIPT}" > /dev/null; then
    echo "Found cron job(s) for auto-sync.sh:"
    crontab -l 2>/dev/null | grep -F "${AUTO_SYNC_SCRIPT}"
    echo ""
    
    read -p "Do you want to remove it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Uninstallation cancelled"
        exit 0
    fi
    
    # Remove cron job
    crontab -l 2>/dev/null | grep -v -F "${AUTO_SYNC_SCRIPT}" | crontab -
    
    echo -e "${GREEN}✅ Cron job removed successfully${NC}"
else
    echo -e "${YELLOW}No cron job found for auto-sync.sh${NC}"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Uninstallation Complete                                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
