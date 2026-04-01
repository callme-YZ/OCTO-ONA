# Cron Configuration for Auto Sync

## Overview

This document describes how to configure cron jobs for automatic daily synchronization of OCTO-ONA data.

## Quick Start

### Install Cron Job

```bash
cd /path/to/OCTO-ONA
./scripts/install-cron.sh
```

**Default schedule:** Daily at 3:00 AM

### Uninstall Cron Job

```bash
./scripts/uninstall-cron.sh
```

---

## Installation Script

### Usage

```bash
./scripts/install-cron.sh
```

### Environment Variables

Customize the cron schedule and source ID:

```bash
CRON_TIME="0 3 * * *" SOURCE_ID="dmwork-octo" ./scripts/install-cron.sh
```

**Variables:**
- `CRON_TIME` - Cron schedule (default: `0 3 * * *` = 3:00 AM daily)
- `SOURCE_ID` - Data source ID (default: `dmwork-octo`)

### Example Output

```
╔══════════════════════════════════════════════════════════╗
║  Install Cron Job for OCTO-ONA Auto Sync                ║
╚══════════════════════════════════════════════════════════╝

Configuration:
  Project root: /Users/yz/OCTO-ONA
  Auto sync script: /Users/yz/OCTO-ONA/scripts/auto-sync.sh
  Cron schedule: 0 3 * * *
  Source ID: dmwork-octo
  Cron log: /Users/yz/OCTO-ONA/logs/sync/cron.log

Cron job to install:
  0 3 * * * cd /Users/yz/OCTO-ONA && /Users/yz/OCTO-ONA/scripts/auto-sync.sh dmwork-octo >> /Users/yz/OCTO-ONA/logs/sync/cron.log 2>&1

✅ Cron job installed successfully

Verification:
✅ Cron job is active

Installed cron job:
0 3 * * * cd /Users/yz/OCTO-ONA && /Users/yz/OCTO-ONA/scripts/auto-sync.sh dmwork-octo >> /Users/yz/OCTO-ONA/logs/sync/cron.log 2>&1
```

---

## Cron Schedule Examples

### Daily at 3:00 AM

```bash
CRON_TIME="0 3 * * *" ./scripts/install-cron.sh
```

### Every 6 hours

```bash
CRON_TIME="0 */6 * * *" ./scripts/install-cron.sh
```

### Twice daily (3 AM and 3 PM)

```bash
CRON_TIME="0 3,15 * * *" ./scripts/install-cron.sh
```

### Weekdays only at 2 AM

```bash
CRON_TIME="0 2 * * 1-5" ./scripts/install-cron.sh
```

### Cron Time Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 7) (Sunday = 0 or 7)
│ │ │ │ │
* * * * *
```

---

## Verification

### List Active Cron Jobs

```bash
crontab -l
```

### Check Specific Job

```bash
crontab -l | grep auto-sync.sh
```

**Expected output:**
```
0 3 * * * cd /Users/yz/OCTO-ONA && /Users/yz/OCTO-ONA/scripts/auto-sync.sh dmwork-octo >> /Users/yz/OCTO-ONA/logs/sync/cron.log 2>&1
```

---

## Monitoring

### View Cron Logs

```bash
tail -f /path/to/OCTO-ONA/logs/sync/cron.log
```

### View Sync Logs

```bash
ls -lt /path/to/OCTO-ONA/logs/sync/
tail -f /path/to/OCTO-ONA/logs/sync/sync_dmwork-octo_YYYYMMDD_HHMMSS.log
```

### Check Last Sync

```bash
mysql -u root octo_ona -e "
  SELECT last_sync_at, status, message 
  FROM sync_status 
  WHERE source_id = 'dmwork-octo' 
  ORDER BY last_sync_at DESC 
  LIMIT 1;
"
```

---

## Troubleshooting

### Cron Job Not Running

**1. Check cron is enabled:**
```bash
sudo launchctl list | grep cron  # macOS
systemctl status cron            # Linux
```

**2. Check cron logs:**
```bash
# macOS
log show --predicate 'process == "cron"' --last 1h

# Linux
grep CRON /var/log/syslog
```

**3. Verify paths are absolute:**
Cron jobs require absolute paths. The install script automatically uses absolute paths.

### Permission Issues

**Ensure scripts are executable:**
```bash
chmod +x scripts/auto-sync.sh
chmod +x scripts/install-cron.sh
chmod +x scripts/uninstall-cron.sh
```

### Environment Variables Not Available

Cron jobs run in a limited environment. If you need environment variables:

**Option 1: Source from a file**
```bash
0 3 * * * . /path/to/.env && cd /path/to/OCTO-ONA && ./scripts/auto-sync.sh
```

**Option 2: Set in crontab**
```cron
OCTO_REMOTE_HOST=remote.example.com
OCTO_REMOTE_USER=readonly

0 3 * * * cd /path/to/OCTO-ONA && ./scripts/auto-sync.sh
```

### Mail Notifications

Cron sends email on errors by default. To configure:

**Disable mail:**
```cron
MAILTO=""
0 3 * * * cd /path/to/OCTO-ONA && ./scripts/auto-sync.sh
```

**Set custom email:**
```cron
MAILTO="admin@example.com"
0 3 * * * cd /path/to/OCTO-ONA && ./scripts/auto-sync.sh
```

---

## Uninstallation

### Remove Cron Job

```bash
./scripts/uninstall-cron.sh
```

**Example output:**
```
╔══════════════════════════════════════════════════════════╗
║  Uninstall Cron Job for OCTO-ONA Auto Sync              ║
╚══════════════════════════════════════════════════════════╝

Found cron job(s) for auto-sync.sh:
0 3 * * * cd /Users/yz/OCTO-ONA && /Users/yz/OCTO-ONA/scripts/auto-sync.sh dmwork-octo >> /Users/yz/OCTO-ONA/logs/sync/cron.log 2>&1

Do you want to remove it? (y/N): y
✅ Cron job removed successfully
```

### Manual Removal

```bash
crontab -e
# Delete the line containing auto-sync.sh
# Save and exit
```

Or remove all cron jobs:
```bash
crontab -r
```

---

## Testing

### Test Installation

```bash
./scripts/test-cron-install.sh
```

**Output:**
```
✅ Scripts exist
✅ Scripts are executable
✅ auto-sync.sh exists
✅ crontab command available
✅ Cron job string constructed correctly
✅ Log directory created/exists
```

### Manual Sync Test

Test the sync script without waiting for cron:

```bash
./scripts/auto-sync.sh dmwork-octo
```

---

## Related

- Issue #38: Cron configuration
- Script: `scripts/auto-sync.sh`
- Documentation: `docs/auto-sync.md`

---

**Last Updated:** 2026-04-01  
**Author:** Mayo
