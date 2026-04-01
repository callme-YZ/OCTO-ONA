# Auto Sync Documentation

## Overview

The auto-sync script (`scripts/auto-sync.sh`) performs daily incremental synchronization of DMWork data from the remote database to the local OCTO-ONA database.

## Features

- ✅ **Incremental sync** - Only syncs new data since last run
- ✅ **Lock file mechanism** - Prevents concurrent sync runs
- ✅ **Comprehensive logging** - All operations logged with timestamps
- ✅ **Health checks** - Database connection verification
- ✅ **Statistics** - Post-sync data counts
- ✅ **Log rotation** - Automatic cleanup of old logs (30 days)
- ✅ **Error handling** - Graceful failure with exit codes

## Usage

### Manual Run

```bash
cd /path/to/OCTO-ONA
./scripts/auto-sync.sh [source_id]
```

**Default source_id:** `dmwork-octo`

**Example:**
```bash
./scripts/auto-sync.sh dmwork-octo
```

### Scheduled Run (via Cron)

See [Cron Configuration](#cron-configuration) below.

---

## How It Works

### Step-by-Step Process

**1. Lock File Check**
- Creates lock file: `/tmp/octo-ona-sync-{source_id}.lock`
- Prevents concurrent runs
- Auto-removes stale locks

**2. Database Health Check**
- Verifies local database connection
- Exits if connection fails

**3. Last Sync Check**
- Queries `sync_status` table
- Determines incremental sync start time

**4. Incremental Sync**
- Runs: `npx ts-node src/cli/index.ts sync {source_id} --verbose`
- Syncs users, channels, messages
- Updates local database

**5. Sync Status Update**
- Records sync completion in `sync_status` table
- Stores timestamp, status, message

**6. Statistics Collection**
- Counts users, bots, messages, channels
- Logs to sync log file

**7. Log Rotation**
- Deletes logs older than 30 days

---

## Logging

### Log Location

```
logs/sync/sync_{source_id}_{timestamp}.log
```

**Example:**
```
logs/sync/sync_dmwork-octo_20260401_030000.log
```

### Log Format

```
[2026-04-01 03:00:00] ╔══════════════════════════════════════════════════════════╗
[2026-04-01 03:00:00] ║  OCTO-ONA Auto Sync                                      ║
[2026-04-01 03:00:00] ╚══════════════════════════════════════════════════════════╝
[2026-04-01 03:00:00] 
[2026-04-01 03:00:00] Source ID: dmwork-octo
[2026-04-01 03:00:00] Log file: logs/sync/sync_dmwork-octo_20260401_030000.log
[2026-04-01 03:00:00] 
[2026-04-01 03:00:00] ━━━ Step 1: Database Health Check ━━━
[2026-04-01 03:00:01] [SUCCESS] Local database connection OK
[2026-04-01 03:00:01] 
[2026-04-01 03:00:01] ━━━ Step 2: Check Last Sync ━━━
[2026-04-01 03:00:01] Last sync: 2026-03-31 03:00:00
[2026-04-01 03:00:01] 
[2026-04-01 03:00:01] ━━━ Step 3: Incremental Sync ━━━
[2026-04-01 03:00:01] Running: npx ts-node src/cli/index.ts sync dmwork-octo --verbose
...
[2026-04-01 03:05:32] [SUCCESS] Sync completed in 331 seconds
[2026-04-01 03:05:32] 
[2026-04-01 03:05:32] ━━━ Step 5: Statistics ━━━
[2026-04-01 03:05:33] Users: 1234 | Bots: 567 | Messages: 591352 | Channels: 890
```

### Log Rotation

Old logs are automatically deleted after 30 days:

```bash
find logs/sync -name "sync_*.log" -mtime +30 -delete
```

---

## Sync Status Table

### Schema

```sql
CREATE TABLE sync_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL,
    last_sync_at TIMESTAMP NOT NULL,
    status ENUM('success', 'failed', 'running') NOT NULL,
    message TEXT,
    duration_seconds INT,
    records_synced INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Query Last Sync

```sql
SELECT last_sync_at, status, message
FROM sync_status
WHERE source_id = 'dmwork-octo'
ORDER BY last_sync_at DESC
LIMIT 1;
```

### Query Sync History

```sql
SELECT *
FROM sync_status
WHERE source_id = 'dmwork-octo'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Lock File Mechanism

### Purpose

Prevents multiple sync processes from running simultaneously.

### Lock File Path

```
/tmp/octo-ona-sync-{source_id}.lock
```

**Example:**
```
/tmp/octo-ona-sync-dmwork-octo.lock
```

### Lock File Content

Contains the PID of the running sync process:

```
12345
```

### Stale Lock Detection

If the lock file exists but the process is not running:

```bash
[WARNING] Stale lock file found, removing...
```

The script automatically removes stale locks and continues.

---

## Error Handling

### Exit Codes

- `0` - Success
- `1` - Failure (lock conflict, database error, sync error)

### Common Errors

**1. Another sync is running**
```
[ERROR] Another sync process is already running (PID: 12345)
[ERROR] If this is a stale lock, remove: /tmp/octo-ona-sync-dmwork-octo.lock
```

**Solution:**
- Wait for the running sync to complete
- Or manually remove the lock file if it's stale

**2. Cannot connect to local database**
```
[ERROR] Cannot connect to local database
```

**Solution:**
- Check MySQL is running: `mysql -u root -e "SELECT 1;"`
- Verify database exists: `mysql -u root -e "SHOW DATABASES LIKE 'octo_ona';"`

**3. Sync failed**
```
[ERROR] Sync failed
```

**Solution:**
- Check the log file for detailed error messages
- Verify remote database configuration
- Check network connectivity

---

## Cron Configuration

See Issue #38 for cron setup.

**Recommended schedule:** Daily at 3:00 AM

```cron
0 3 * * * cd /path/to/OCTO-ONA && ./scripts/auto-sync.sh dmwork-octo >> logs/sync/cron.log 2>&1
```

---

## Testing

### Run Tests

```bash
./scripts/test-auto-sync.sh
```

### Test Coverage

- ✅ sync_status table exists
- ✅ Insert sync status
- ✅ Query last sync
- ✅ Script is executable
- ✅ Log directory creation
- ✅ Lock file mechanism

---

## Configuration

### Environment Variables

The sync script uses the following environment variables (optional):

```bash
# Local database
OCTO_LOCAL_HOST=localhost
OCTO_LOCAL_PORT=3306
OCTO_LOCAL_USER=root
OCTO_LOCAL_PASSWORD=
OCTO_LOCAL_DATABASE=octo_ona

# Remote database
OCTO_REMOTE_HOST=remote.example.com
OCTO_REMOTE_PORT=3306
OCTO_REMOTE_USER=readonly_user
OCTO_REMOTE_PASSWORD=secret
OCTO_REMOTE_DATABASE=im
```

### Config Files

Alternatively, use config files:

- `octo-ona.config.json` (local database)
- `dmwork-octo.config.json` (remote database)

---

## Related

- Issue #37: Auto sync script
- Issue #38: Cron configuration
- Migration: `v3-003-sync-status.sql`
- CLI: `src/cli/sync.ts`

---

**Last Updated:** 2026-04-01  
**Author:** Mayo
