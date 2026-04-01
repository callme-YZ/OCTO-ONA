-- ============================================
-- OCTO-ONA v3.0 Migration: Sync Status Table
-- ============================================
-- Migration: v3-003
-- Description: Add sync_status table for tracking sync operations
-- Author: Mayo
-- Date: 2026-04-01
-- Related Issue: #37
-- ============================================

-- Sync Status Table
-- Tracks sync operations and their results

CREATE TABLE IF NOT EXISTS sync_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL COMMENT 'Data source ID',
    last_sync_at TIMESTAMP NOT NULL COMMENT 'Last successful sync timestamp',
    status ENUM('success', 'failed', 'running') NOT NULL DEFAULT 'running' COMMENT 'Sync status',
    message TEXT COMMENT 'Status message or error details',
    duration_seconds INT COMMENT 'Sync duration in seconds',
    records_synced INT COMMENT 'Number of records synced',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_source_id (source_id),
    INDEX idx_last_sync (last_sync_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Sync status tracking table for auto-sync operations';

-- ============================================
-- Validation Query Examples
-- ============================================

-- Get last successful sync for a source:
-- SELECT last_sync_at, message 
-- FROM sync_status 
-- WHERE source_id = ? AND status = 'success'
-- ORDER BY last_sync_at DESC LIMIT 1;

-- Get sync history:
-- SELECT * FROM sync_status 
-- WHERE source_id = ? 
-- ORDER BY created_at DESC LIMIT 10;

-- Check if sync is running:
-- SELECT COUNT(*) 
-- FROM sync_status 
-- WHERE source_id = ? AND status = 'running';

-- ============================================
-- Migration Complete
-- ============================================
