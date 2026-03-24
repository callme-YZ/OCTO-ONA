-- ============================================
-- OCTO-ONA Migration: v1.x → v2.0
-- ============================================
-- Purpose: Migrate from file-based storage to database-driven architecture
-- Date: 2026-03-24

-- Step 1: Backup existing data (if any)
-- (Manual: export current analysis results to JSON before running this)

-- Step 2: Drop old tables (if exist)
-- (v1.x had no tables, skip this step)

-- Step 3: Create v2.0 schema
SOURCE schema-v2.sql;

-- Step 4: Verify tables
SELECT 
    TABLE_NAME, 
    TABLE_ROWS, 
    CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'octo_ona'
ORDER BY TABLE_NAME;

-- Step 5: Seed initial data (metrics)
-- (Will be done in Issue #19 via seed-metrics.sql)

-- Step 6: Migration complete
SELECT 'Migration v1.x → v2.0 complete!' AS status;
