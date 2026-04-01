-- ============================================
-- OCTO-ONA v3.0 Migration: User Bot Ownership
-- ============================================
-- Migration: v3-001
-- Description: Add user_bot_ownership table for conversational permission control
-- Author: Mayo
-- Date: 2026-04-01
-- Related Issue: #33
-- ============================================

-- User Bot Ownership Table
-- Records which bots are owned/created by which users
-- Used for permission checking in conversational queries

CREATE TABLE IF NOT EXISTS user_bot_ownership (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL COMMENT 'Owner user ID (from users.uid)',
    bot_id VARCHAR(128) NOT NULL COMMENT 'Bot user ID (from users.uid where is_bot=true)',
    source_id VARCHAR(64) NOT NULL COMMENT 'Data source ID (for validation)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When this ownership was created',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_bot_id (bot_id),
    INDEX idx_source_id (source_id),
    
    -- Ensure one bot can only have one owner per source
    UNIQUE KEY uk_user_bot (user_id, bot_id)
    
    -- Foreign keys (optional, depends on your constraint needs)
    -- Uncomment if you want strict referential integrity:
    -- , FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
    -- , FOREIGN KEY (bot_id) REFERENCES users(uid) ON DELETE CASCADE
    -- , FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE
    
    -- Note: Foreign keys are commented out by default to allow flexibility
    -- in bot ownership assignment before users/bots are fully synced
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User Bot Ownership for v3.0 conversational permission control';

-- ============================================
-- Validation Query Examples
-- ============================================

-- Check if user owns a bot:
-- SELECT 1 FROM user_bot_ownership WHERE user_id = ? AND bot_id = ? LIMIT 1;

-- List all bots owned by a user:
-- SELECT bot_id FROM user_bot_ownership WHERE user_id = ?;

-- Find owner of a bot:
-- SELECT user_id FROM user_bot_ownership WHERE bot_id = ?;

-- ============================================
-- Migration Complete
-- ============================================
