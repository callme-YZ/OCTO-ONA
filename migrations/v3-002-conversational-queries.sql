-- ============================================
-- OCTO-ONA v3.0 Migration: Conversational Queries
-- ============================================
-- Migration: v3-002
-- Description: Add conversational_queries table for query audit logging
-- Author: Mayo
-- Date: 2026-04-01
-- Related Issue: #34
-- ============================================

-- Conversational Queries Audit Log Table
-- Records all conversational queries from users
-- Used for audit, analytics, and improving intent parsing

CREATE TABLE IF NOT EXISTS conversational_queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL COMMENT 'User who made the query (from users.uid)',
    query_text TEXT NOT NULL COMMENT 'Original user question',
    parsed_intent VARCHAR(50) COMMENT 'Parsed intent (health/trend/network/bot_activity/report)',
    target_scope VARCHAR(255) COMMENT 'Query target (self/bot_id)',
    metrics_requested JSON COMMENT 'Array of metric IDs requested',
    permission_result ENUM('allowed', 'denied') NOT NULL COMMENT 'Permission check result',
    response_summary TEXT COMMENT 'Summary of the response sent to user',
    response_time_ms INT COMMENT 'Response time in milliseconds',
    error_message TEXT COMMENT 'Error message if query failed',
    data_timestamp TIMESTAMP NULL COMMENT 'Timestamp of the data used (for data freshness tracking)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When this query was made',
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_user_time (user_id, created_at),
    INDEX idx_intent (parsed_intent),
    INDEX idx_permission (permission_result)
    
    -- Foreign keys (optional, depends on your constraint needs)
    -- Uncomment if you want strict referential integrity:
    -- , FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
    
    -- Note: Foreign keys are commented out by default to allow flexibility
    -- in query logging before users are fully synced
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Conversational queries audit log for v3.0';

-- ============================================
-- Validation Query Examples
-- ============================================

-- Get user's query history:
-- SELECT query_text, parsed_intent, created_at 
-- FROM conversational_queries 
-- WHERE user_id = ? 
-- ORDER BY created_at DESC LIMIT 10;

-- Count queries by intent:
-- SELECT parsed_intent, COUNT(*) as count 
-- FROM conversational_queries 
-- GROUP BY parsed_intent;

-- Find denied queries:
-- SELECT user_id, query_text, created_at 
-- FROM conversational_queries 
-- WHERE permission_result = 'denied' 
-- ORDER BY created_at DESC;

-- Average response time:
-- SELECT AVG(response_time_ms) as avg_ms 
-- FROM conversational_queries 
-- WHERE response_time_ms IS NOT NULL;

-- ============================================
-- Migration Complete
-- ============================================
