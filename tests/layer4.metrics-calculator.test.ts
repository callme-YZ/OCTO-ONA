/**
 * Layer 4 MetricsCalculator - Unit Tests
 */

import { MetricsCalculator, MetricDefinition } from '../src/layer4/metrics-calculator';
import { CORE_METRICS } from '../src/layer4/core-metrics';
import { NetworkGraph, HumanNode, AIAgentNode, Edge, Message } from '../src/layer2/models';

describe('Layer 4: MetricsCalculator', () => {
  
  let testGraph: NetworkGraph;
  let calculator: MetricsCalculator;
  
  beforeEach(() => {
    // Create test network
    const humans: HumanNode[] = [
      { id: 'h1', name: 'Alice', type: 'human' },
      { id: 'h2', name: 'Bob', type: 'human' },
    ];
    
    const bots: AIAgentNode[] = [
      { id: 'b1', bot_name: 'Bot1', type: 'ai_agent', capabilities: [], functional_tags: ['T5'] },
    ];
    
    const edges: Edge[] = [
      { source: 'h1', target: 'h2', edge_type: 'H2H', weight: 5, is_cross_team: false, message_ids: [] },
      { source: 'h1', target: 'b1', edge_type: 'H2B', weight: 10, is_cross_team: false, message_ids: [] },
    ];
    
    const messages: Message[] = [
      { id: 'm1', from_uid: 'h1', to_uids: ['h2'], content: '感觉不对', timestamp: new Date() },
      { id: 'm2', from_uid: 'h1', to_uids: ['b1'], content: 'UI很优雅', timestamp: new Date() },
      { id: 'm3', from_uid: 'b1', to_uids: ['h1'], content: '收到', timestamp: new Date() },
    ];
    
    testGraph = {
      graph_id: 'test',
      description: 'Test graph',
      start_time: new Date('2026-03-01'),
      end_time: new Date('2026-03-18'),
      human_nodes: humans,
      ai_agent_nodes: bots,
      edges,
      messages,
      summary: {
        total_nodes: 3,
        total_humans: 2,
        total_bots: 1,
        total_edges: edges.length,
        total_messages: messages.length,
      },
      created_at: new Date(),
      version: '2.0',
    };
    
    calculator = new MetricsCalculator(testGraph);
  });
  
  // ========================================
  // Registration Tests
  // ========================================
  
  describe('Metric Registration', () => {
    it('should register a metric', () => {
      const testMetric: MetricDefinition = {
        id: 'TEST.1',
        name: 'Test Metric',
        category: 'network',
        priority: 'P0',
        calculator: () => 42,
      };
      
      calculator.registerMetric(testMetric);
      
      const list = calculator.listMetrics();
      expect(list.some(m => m.id === 'TEST.1')).toBe(true);
    });
    
    it('should register multiple metrics', () => {
      calculator.registerMetrics(CORE_METRICS);
      
      const list = calculator.listMetrics();
      expect(list.length).toBe(CORE_METRICS.length);
    });
  });
  
  // ========================================
  // Calculation Tests
  // ========================================
  
  describe('Metric Calculation', () => {
    beforeEach(() => {
      calculator.registerMetrics(CORE_METRICS);
    });
    
    it('should calculate a single metric', async () => {
      const result = await calculator.calculateMetric('L1.4');
      
      expect(result.metricId).toBe('L1.4');
      expect(result.name).toBe('网络密度');
      expect(result.category).toBe('network');
      expect(typeof result.value).toBe('number');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
    
    it('should calculate all P0 metrics', async () => {
      const results = await calculator.calculateAll('P0');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(CORE_METRICS.length);
    });
    
    it('should calculate metrics by category', async () => {
      const networkMetrics = await calculator.calculateByCategory('network');
      
      expect(networkMetrics.length).toBeGreaterThan(0);
      expect(networkMetrics.every(m => m.category === 'network')).toBe(true);
    });
  });
  
  // ========================================
  // Export Tests
  // ========================================
  
  describe('Export', () => {
    it('should export results to JSON', async () => {
      calculator.registerMetrics(CORE_METRICS);
      const results = await calculator.calculateAll('P0');
      
      const json = calculator.exportToJSON(results);
      const parsed = JSON.parse(json);
      
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.graphId).toBe('test');
      expect(parsed.metrics).toBeDefined();
      expect(Object.keys(parsed.metrics).length).toBe(results.length);
    });
  });
  
  // ========================================
  // Core Metrics Tests
  // ========================================
  
  describe('Core Metrics', () => {
    beforeEach(() => {
      calculator.registerMetrics(CORE_METRICS);
    });
    
    it('should calculate Hub Score (L3.5)', async () => {
      const result = await calculator.calculateMetric('L3.5');
      
      expect(result.value).toBeDefined();
      expect(typeof result.value).toBe('object');
    });
    
    it('should calculate Connoisseurship Frequency (L3.1)', async () => {
      const result = await calculator.calculateMetric('L3.1');
      
      expect(result.value).toBeDefined();
      expect(typeof result.value).toBe('object');
    });
    
    it('should calculate Network Density (L1.4)', async () => {
      const result = await calculator.calculateMetric('L1.4');
      
      expect(typeof result.value).toBe('number');
      expect(result.value as number).toBeGreaterThanOrEqual(0);
      expect(result.value as number).toBeLessThanOrEqual(1);
    });
  });
});
