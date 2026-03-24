/**
 * MetricsCalculator v2 Tests
 */

import { MetricsCalculator } from '../../src/layer4/metrics-calculator-v2';
import { LocalDatabase } from '../../src/database/local-database';
import { NetworkGraph } from '../../src/layer2/models';

const LOCAL_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'octo_ona',
};

describe('MetricsCalculator v2', () => {
  let db: LocalDatabase;
  let mockGraph: NetworkGraph;

  beforeAll(() => {
    db = new LocalDatabase(LOCAL_CONFIG);

    mockGraph = {
      graph_id: 'test_calc_v2',
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
      ],
    };
  });

  afterAll(async () => {
    await db.close();
  });

  describe('v2 mode (database-driven)', () => {
    let calculator: MetricsCalculator;

    beforeAll(() => {
      calculator = new MetricsCalculator(mockGraph, db);
    });

    it('should calculate metric using database definition (L1.4)', async () => {
      const result = await calculator.calculateMetric('L1.4');

      expect(result).toBeDefined();
      expect(result.metricId).toBe('L1.4');
      expect(result.name).toBe('Network Density');
      expect(result.category).toBe('network');
      expect(typeof result.value).toBe('number');
    });

    it('should calculate metric with parameters (L3.3)', async () => {
      const result = await calculator.calculateMetric('L3.3', { window_minutes: 60 });

      expect(result).toBeDefined();
      expect(result.metricId).toBe('L3.3');
    });

    it('should calculate multiple metrics', async () => {
      const results = await calculator.calculateMetrics(['L1.1', 'L1.4', 'L2.2']);

      expect(results.length).toBe(3);
      expect(results.map(r => r.metricId)).toContain('L1.1');
      expect(results.map(r => r.metricId)).toContain('L1.4');
      expect(results.map(r => r.metricId)).toContain('L2.2');
    });

    it('should calculate all P0 metrics', async () => {
      const results = await calculator.calculateByPriority('P0');

      expect(results.length).toBeGreaterThanOrEqual(10);
      for (const result of results) {
        expect(result.metricId).toBeDefined();
        expect(result.value).toBeDefined();
      }
    });

    it('should calculate all active metrics', async () => {
      const results = await calculator.calculateAll();

      expect(results.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('v1 mode (legacy, no database)', () => {
    let calculator: MetricsCalculator;

    beforeAll(() => {
      calculator = new MetricsCalculator(mockGraph); // No DB

      // Register a legacy metric
      calculator.registerMetric({
        id: 'TEST.1',
        name: 'Test Metric',
        category: 'network',
        priority: 'P0',
        calculator: async (graph, engine) => {
          return graph.edges.length;
        },
        unit: 'count',
      });
    });

    it('should calculate legacy metric', async () => {
      const result = await calculator.calculateMetric('TEST.1');

      expect(result).toBeDefined();
      expect(result.metricId).toBe('TEST.1');
      expect(result.name).toBe('Test Metric');
      expect(result.value).toBe(3); // 3 edges in mockGraph
    });

    it('should list registered metrics', () => {
      const metrics = calculator.listMetrics();

      expect(metrics.length).toBeGreaterThanOrEqual(1);
      expect(metrics.some(m => m.id === 'TEST.1')).toBe(true);
    });

    it('should get metrics by priority', () => {
      const p0Metrics = calculator.getMetricsByPriority('P0');

      expect(p0Metrics.length).toBeGreaterThanOrEqual(1);
      expect(p0Metrics.every(m => m.priority === 'P0')).toBe(true);
    });

    it('should get metrics by category', () => {
      const networkMetrics = calculator.getMetricsByCategory('network');

      expect(networkMetrics.length).toBeGreaterThanOrEqual(1);
      expect(networkMetrics.every(m => m.category === 'network')).toBe(true);
    });
  });

  describe('hybrid mode (v2 with legacy fallback)', () => {
    let calculator: MetricsCalculator;

    beforeAll(() => {
      calculator = new MetricsCalculator(mockGraph, db);

      // Register a legacy metric (not in DB)
      calculator.registerMetric({
        id: 'LEGACY.1',
        name: 'Legacy Only',
        category: 'network',
        priority: 'P1',
        calculator: async () => 42,
      });
    });

    it('should prefer database metric over legacy', async () => {
      const result = await calculator.calculateMetric('L1.4');

      expect(result.metricId).toBe('L1.4');
      expect(result.name).toBe('Network Density'); // From DB
    });

    it('should fallback to legacy if not in database', async () => {
      const result = await calculator.calculateMetric('LEGACY.1');

      expect(result.metricId).toBe('LEGACY.1');
      expect(result.name).toBe('Legacy Only');
      expect(result.value).toBe(42);
    });
  });
});
