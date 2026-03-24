/**
 * Seed Metrics Verification Tests
 */

import { LocalDatabase } from '../../src/database/local-database';

const LOCAL_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'octo_ona',
};

describe('Seed Metrics Verification', () => {
  let db: LocalDatabase;

  beforeAll(() => {
    db = new LocalDatabase(LOCAL_CONFIG);
  });

  afterAll(async () => {
    await db.close();
  });

  it('should have 4 metric categories', async () => {
    const [rows]: any = await (db as any).pool.query(
      'SELECT COUNT(*) as count FROM metric_categories'
    );
    expect(rows[0].count).toBe(4);
  });

  it('should have 10 P0 metrics', async () => {
    const [rows]: any = await (db as any).pool.query(
      "SELECT COUNT(*) as count FROM metrics WHERE priority = 'P0' AND status = 'active'"
    );
    expect(rows[0].count).toBeGreaterThanOrEqual(10);
  });

  it('should have formulas for all P0 metrics', async () => {
    const [rows]: any = await (db as any).pool.query(
      `SELECT m.id, m.name_zh, COUNT(mf.id) as formula_count
       FROM metrics m
       LEFT JOIN metric_formulas mf ON m.id = mf.metric_id
       WHERE m.priority = 'P0' AND m.status = 'active'
       GROUP BY m.id, m.name_zh
       HAVING formula_count = 0`
    );
    expect(rows.length).toBe(0); // No metrics without formulas
  });

  it('should have correct metric categories', async () => {
    const [rows]: any = await (db as any).pool.query(
      'SELECT id, name_zh FROM metric_categories ORDER BY display_order'
    );

    const categories = rows.map((r: any) => r.id);
    expect(categories).toContain('network');
    expect(categories).toContain('collaboration');
    expect(categories).toContain('connoisseurship');
    expect(categories).toContain('bot_tag');
  });

  it('should have parameters for L3.3 and T5', async () => {
    const [rows]: any = await (db as any).pool.query(
      `SELECT m.id, COUNT(mp.id) as param_count
       FROM metrics m
       JOIN metric_formulas mf ON m.id = mf.metric_id
       LEFT JOIN metric_parameters mp ON mf.id = mp.formula_id
       WHERE m.id IN ('L3.3', 'T5')
       GROUP BY m.id`
    );

    expect(rows.length).toBe(2);
    for (const row of rows) {
      expect(row.param_count).toBeGreaterThan(0);
    }
  });

  it('should have changelog entries for seeded metrics', async () => {
    const [rows]: any = await (db as any).pool.query(
      `SELECT COUNT(*) as count 
       FROM metric_changelog 
       WHERE change_type = 'created' AND changed_by = 'seed-script'`
    );
    expect(rows[0].count).toBeGreaterThanOrEqual(10);
  });

  it('should have all metrics in active status', async () => {
    const [rows]: any = await (db as any).pool.query(
      `SELECT id, name_zh FROM metrics WHERE status != 'active'`
    );
    expect(rows.length).toBe(0);
  });

  it('should use custom formula type for all P0 metrics', async () => {
    const [rows]: any = await (db as any).pool.query(
      `SELECT m.id, mf.formula_type
       FROM metrics m
       JOIN metric_formulas mf ON m.id = mf.metric_id
       WHERE m.priority = 'P0' AND mf.is_active = TRUE`
    );

    for (const row of rows) {
      expect(row.formula_type).toBe('custom');
    }
  });
});
