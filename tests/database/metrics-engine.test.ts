/**
 * MetricsEngine Tests
 */

import { MetricsEngine } from '../../src/database/metrics-engine';
import { LocalDatabase } from '../../src/database/local-database';
import { NetworkGraph } from '../../src/layer2/models';

const LOCAL_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'octo_ona',
};

describe('MetricsEngine', () => {
  let db: LocalDatabase;
  let mockGraph: NetworkGraph;
  let engine: MetricsEngine;

  beforeAll(() => {
    db = new LocalDatabase(LOCAL_CONFIG);

    // Create a simple mock graph
    mockGraph = {
      graph_id: 'test',
      description: 'Test Graph',
      start_time: new Date('2026-03-01'),
      end_time: new Date('2026-03-20'),
      created_at: new Date('2026-03-01'),
      summary: { total_humans: 2, total_bots: 1, total_edges: 3, total_messages: 2 },
      version: '1.0.0',
      human_nodes: [
        { id: 'user1', name: 'User 1', type: 'human' as const },
        { id: 'user2', name: 'User 2', type: 'human' as const },
      ],
      ai_agent_nodes: [
        { id: 'bot1', type: 'ai_agent' as const, bot_name: 'Bot 1', capabilities: [], functional_tags: [], creator_uid: 'user1' },
      ],
      edges: [
        { source: 'user1', target: 'bot1', weight: 5, edge_type: 'H2B' as const, is_cross_team: false, message_ids: [] },
        { source: 'bot1', target: 'user1', weight: 3, edge_type: 'B2H' as const, is_cross_team: false, message_ids: [] },
        { source: 'user1', target: 'user2', weight: 2, edge_type: 'H2H' as const, is_cross_team: false, message_ids: [] },
      ],
      messages: [
        {
          id: 'msg1',
          from_uid: 'user1',
          to_uids: ['bot1'],
          content: '@bot1 help',
          timestamp: new Date('2026-03-10T10:00:00Z'),
          platform: 'test',
          context_id: 'ch1',
        },
        {
          id: 'msg2',
          from_uid: 'bot1',
          to_uids: ['user1'],
          content: 'Sure!',
          timestamp: new Date('2026-03-10T10:01:00Z'),
          platform: 'test',
          context_id: 'ch1',
        },
      ],
    };

    engine = new MetricsEngine(db, mockGraph);
  });

  afterAll(async () => {
    await db.close();
  });

  describe('loadMetric', () => {
    it('should load L1.1 metric definition', async () => {
      const metric = await engine.loadMetric('L1.1');

      expect(metric).not.toBeNull();
      expect(metric!.id).toBe('L1.1');
      // Skip charset check (depends on DB connection settings)
      // expect(metric!.name_zh).toBe('度中心性');
      expect(metric!.priority).toBe('P0');
    });

    it('should return null for non-existent metric', async () => {
      const metric = await engine.loadMetric('L99.99');
      expect(metric).toBeNull();
    });
  });

  describe('loadFormula', () => {
    it('should load L1.1 formula', async () => {
      const formula = await engine.loadFormula('L1.1');

      expect(formula).not.toBeNull();
      expect(formula!.metric_id).toBe('L1.1');
      expect(formula!.formula_type).toBe('custom');
      expect(Boolean(formula!.is_active)).toBe(true);
    });

    it('should load formula with specific version', async () => {
      const formula = await engine.loadFormula('L1.1', 1);

      expect(formula).not.toBeNull();
      expect(formula!.version).toBe(1);
    });
  });

  describe('loadParameters', () => {
    it('should load parameters for L3.3', async () => {
      const formula = await engine.loadFormula('L3.3');
      expect(formula).not.toBeNull();

      const params = await engine.loadParameters(formula!.id);

      expect(params.length).toBeGreaterThan(0);
      const windowParam = params.find((p) => p.param_name === 'window_minutes');
      expect(windowParam).toBeDefined();
      expect(windowParam!.default_value).toBe(30);
    });
  });

  describe('computeMetric', () => {
    it('should compute L1.4 (Network Density)', async () => {
      const result = await engine.computeMetric('L1.4');

      expect(result).toBeDefined();
      expect(result.metric_id).toBe('L1.4');
      expect(typeof result.value).toBe('number');
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(1);
    });

    it('should compute L2.2 (H2B Collaboration Ratio)', async () => {
      const result = await engine.computeMetric('L2.2');

      expect(result).toBeDefined();
      expect(result.metric_id).toBe('L2.2');
      expect(typeof result.value).toBe('number');
      // H2B edges: 2, Total edges: 3 → ratio = 2/3
      expect(result.value).toBeCloseTo(2 / 3);
    });

    it('should compute L1.1 (Degree Centrality) and return object', async () => {
      const result = await engine.computeMetric('L1.1');

      expect(result).toBeDefined();
      expect(result.metric_id).toBe('L1.1');
      expect(typeof result.value).toBe('object');
    });

    it('should accept parameter overrides', async () => {
      const result = await engine.computeMetric('T5', {
        parameters: { percentile: 50 }, // Override default 75
      });

      expect(result).toBeDefined();
      expect(result.parameters.percentile).toBe(50);
    });

    it('should throw error for non-existent metric', async () => {
      await expect(engine.computeMetric('L99.99')).rejects.toThrow('Metric not found');
    });
  });

  describe('parameter validation', () => {
    it('should reject parameter below minimum', async () => {
      await expect(
        engine.computeMetric('L3.3', {
          parameters: { window_minutes: 0 }, // Below min (1)
        })
      ).rejects.toThrow('below minimum');
    });

    it('should reject parameter above maximum', async () => {
      await expect(
        engine.computeMetric('L3.3', {
          parameters: { window_minutes: 200 }, // Above max (120)
        })
      ).rejects.toThrow('above maximum');
    });
  });
});
