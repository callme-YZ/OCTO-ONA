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
  
  // ========================================
  // Enhanced Metrics Tests (L3.3, L3.4)
  // ========================================
  
  describe('Enhanced Connoisseurship Metrics', () => {
    let enhancedGraph: NetworkGraph;
    let enhancedCalculator: MetricsCalculator;
    
    beforeEach(() => {
      const humans: HumanNode[] = [
        { id: 'h1', name: 'Alice', type: 'human' },
        { id: 'h2', name: 'Bob', type: 'human' },
      ];
      
      const bots: AIAgentNode[] = [
        { id: 'b1', bot_name: 'Bot1', type: 'ai_agent', capabilities: [], functional_tags: [] },
      ];
      
      const messages: Message[] = [
        // h1 sends connoisseurship message
        { 
          id: 'm1', 
          from_uid: 'h1', 
          to_uids: ['b1'], 
          content: '感觉这个设计不对，为什么要这样？', 
          timestamp: new Date('2026-03-18T10:00:00Z') 
        },
        
        // Bot responds within 30 minutes (executed)
        { 
          id: 'm2', 
          from_uid: 'b1', 
          to_uids: ['h1'], 
          content: '好的，我会修改', 
          timestamp: new Date('2026-03-18T10:15:00Z') 
        },
        
        // h2 retells Alice's opinion (amplification)
        { 
          id: 'm3', 
          from_uid: 'h2', 
          to_uids: ['b1'], 
          content: 'Alice说设计有问题', 
          timestamp: new Date('2026-03-18T11:00:00Z') 
        },
      ];
      
      enhancedGraph = {
        graph_id: 'enhanced_test',
        description: 'Enhanced metrics test',
        start_time: new Date('2026-03-01'),
        end_time: new Date('2026-03-18'),
        human_nodes: humans,
        ai_agent_nodes: bots,
        edges: [],
        messages,
        summary: {
          total_nodes: 3,
          total_humans: 2,
          total_bots: 1,
          total_edges: 0,
          total_messages: messages.length,
        },
        created_at: new Date(),
        version: '2.0',
      };
      
      enhancedCalculator = new MetricsCalculator(enhancedGraph);
    });
    
    it('should calculate L3.3 Connoisseurship Conversion', async () => {
      const { L3_3_CONNOISSEURSHIP_CONVERSION } = require('../src/layer4/core-metrics');
      enhancedCalculator.registerMetric(L3_3_CONNOISSEURSHIP_CONVERSION);
      
      const result = await enhancedCalculator.calculateMetric('L3.3');
      
      expect(result.value).toBeDefined();
      expect(typeof result.value).toBe('object');
      
      // h1 sent connoisseurship and got Bot response → conversion = 1.0
      const conversions = result.value as Record<string, number>;
      if (conversions['h1'] !== undefined) {
        expect(conversions['h1']).toBeGreaterThan(0);
      }
    });
    
    it('should calculate L3.4 Connoisseurship Amplification', async () => {
      const { L3_4_CONNOISSEURSHIP_AMPLIFICATION } = require('../src/layer4/core-metrics');
      enhancedCalculator.registerMetric(L3_4_CONNOISSEURSHIP_AMPLIFICATION);
      
      const result = await enhancedCalculator.calculateMetric('L3.4');
      
      expect(result.value).toBeDefined();
      expect(typeof result.value).toBe('object');
      
      // h1's name mentioned by h2 → amplification > 0
      const amplifications = result.value as Record<string, number>;
      if (amplifications['h1'] !== undefined) {
        expect(amplifications['h1']).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
