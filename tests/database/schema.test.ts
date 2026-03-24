/**
 * Schema Validation Tests
 * 验证 v2.0 数据库表结构
 */

import mysql from 'mysql2/promise';

const TEST_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'octo_ona',
};

describe('Database Schema v2.0', () => {
  let conn: mysql.Connection;

  beforeAll(async () => {
    conn = await mysql.createConnection(TEST_CONFIG);
  });

  afterAll(async () => {
    await conn.end();
  });

  // Test 1: All tables exist
  it('should have all 11 core tables', async () => {
    const [rows]: any = await conn.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'octo_ona' 
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    const tableNames = rows.map((r: any) => r.TABLE_NAME);
    
    expect(tableNames).toContain('data_sources');
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('channels');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('sync_metadata');
    expect(tableNames).toContain('metric_categories');
    expect(tableNames).toContain('metrics');
    expect(tableNames).toContain('metric_formulas');
    expect(tableNames).toContain('metric_parameters');
    expect(tableNames).toContain('analysis_results');
    expect(tableNames).toContain('metric_changelog');
  });

  // Test 2: All views exist
  it('should have all 5 views', async () => {
    const [rows]: any = await conn.query(`
      SELECT TABLE_NAME 
      FROM information_schema.VIEWS 
      WHERE TABLE_SCHEMA = 'octo_ona'
      ORDER BY TABLE_NAME
    `);
    
    const viewNames = rows.map((r: any) => r.TABLE_NAME);
    
    expect(viewNames).toContain('v_messages_enriched');
    expect(viewNames).toContain('v_channel_stats');
    expect(viewNames).toContain('v_user_stats');
    expect(viewNames).toContain('v_metrics_overview');
    expect(viewNames).toContain('v_latest_analysis');
  });

  // Test 3: Foreign key constraints
  it('should have correct foreign keys on messages table', async () => {
    const [rows]: any = await conn.query(`
      SELECT 
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'octo_ona'
        AND TABLE_NAME = 'messages'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    const fks = rows.map((r: any) => r.REFERENCED_TABLE_NAME);
    
    expect(fks).toContain('data_sources');
    expect(fks).toContain('channels');
    expect(fks).toContain('users');
  });

  // Test 4: Indexes on messages table
  it('should have indexes on messages table', async () => {
    const [rows]: any = await conn.query(`
      SELECT DISTINCT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = 'octo_ona'
        AND TABLE_NAME = 'messages'
        AND INDEX_NAME != 'PRIMARY'
    `);
    
    const indexes = rows.map((r: any) => r.INDEX_NAME);
    
    expect(indexes).toContain('idx_timestamp');
    expect(indexes).toContain('idx_channel');
    expect(indexes).toContain('idx_from_uid');
  });

  // Test 5: Data types validation
  it('should have correct column types for messages', async () => {
    const [rows]: any = await conn.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'octo_ona'
        AND TABLE_NAME = 'messages'
      ORDER BY ORDINAL_POSITION
    `);
    
    const columns: any = {};
    rows.forEach((r: any) => {
      columns[r.COLUMN_NAME] = { type: r.DATA_TYPE, nullable: r.IS_NULLABLE };
    });
    
    expect(columns.message_id.type).toBe('varchar');
    expect(columns.message_id.nullable).toBe('NO');
    expect(columns.timestamp.type).toBe('bigint');
    expect(columns.content.type).toBe('text');
    expect(columns.mentioned_uids.type).toBe('json');
  });

  // Test 6: Enum values
  it('should have correct enum values for data_sources.type', async () => {
    const [rows]: any = await conn.query(`
      SELECT COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'octo_ona'
        AND TABLE_NAME = 'data_sources'
        AND COLUMN_NAME = 'type'
    `);
    
    const enumType = rows[0].COLUMN_TYPE;
    
    expect(enumType).toContain('discord');
    expect(enumType).toContain('dmwork');
    expect(enumType).toContain('github');
  });
});
