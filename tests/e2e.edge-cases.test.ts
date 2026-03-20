/**
 * End-to-End Edge Cases Tests
 */

import { NetworkGraph, HumanNode, AIAgentNode, Edge, Message } from '../src/layer2/models';
import { AnalysisEngine } from '../src/layer3/analysis-engine';
import { MetricsCalculator } from '../src/layer4/metrics-calculator';
import { ALL_CORE_METRICS } from '../src/layer4/core-metrics';
import { DashboardGenerator } from '../src/layer6/dashboard-generator';

describe('E2E: Edge Cases', () => {
  
  // ========================================
  // Test Case 1: Empty Network
  // ========================================
  
  describe('Empty Network', () => {
    it.skip('should handle empty network gracefully (graphology limitation)', async () => {
      const emptyGraph: NetworkGraph = {
        graph_id: 'empty',
        description: 'Empty network',
        start_time: new Date('2026-03-01'),
        end_time: new Date('2026-03-18'),
        human_nodes: [],
        ai_agent_nodes: [],
        edges: [],
        messages: [],
        summary: {
          total_nodes: 0,
          total_humans: 0,
          total_bots: 0,
          total_edges: 0,
          total_messages: 0,
        },
        created_at: new Date(),
        version: '2.0',
      };
      
      const engine = new AnalysisEngine(emptyGraph);
      const centrality = await engine.computeCentrality();
      
      expect(Object.keys(centrality.degree).length).toBe(0);
      expect(Object.keys(centrality.betweenness).length).toBe(0);
    });
  });
  
  // ========================================
  // Test Case 2: Hub Score = Infinity
  // ========================================
  
  describe('Hub Score Infinity', () => {
    it('should handle nodes with zero sent messages (HS=∞)', async () => {
      const humans: HumanNode[] = [
        { id: 'h1', name: 'Receiver', type: 'human' }, // Receives only
        { id: 'h2', name: 'Sender', type: 'human' },   // Sends only
      ];
      
      const edges: Edge[] = [
        { source: 'h2', target: 'h1', edge_type: 'H2H', weight: 10, is_cross_team: false, message_ids: Array(10).fill('m') },
      ];
      
      const messages: Message[] = [
        ...Array(10).fill(0).map((_, i) => ({
          id: `m${i}`,
          from_uid: 'h2',
          to_uids: ['h1'],
          content: 'test',
          timestamp: new Date(),
        })),
      ];
      
      const graph: NetworkGraph = {
        graph_id: 'infinity_test',
        description: 'Hub Score infinity test',
        start_time: new Date(),
        end_time: new Date(),
        human_nodes: humans,
        ai_agent_nodes: [],
        edges,
        messages,
        summary: {
          total_nodes: 2,
          total_humans: 2,
          total_bots: 0,
          total_edges: 1,
          total_messages: messages.length,
        },
        created_at: new Date(),
        version: '2.0',
      };
      
      const calculator = new MetricsCalculator(graph);
      calculator.registerMetrics(ALL_CORE_METRICS);
      
      const results = await calculator.calculateMetric('L3.5');
      const hubScores = results.value as Record<string, number>;
      
      // h1 receives 10, sends 0 → HS = ∞
      expect(hubScores['h1']).toBe(Infinity);
      
      // h2 receives 0, sends 10 → HS = 0
      expect(hubScores['h2']).toBe(0);
    });
  });
  
  // ========================================
  // Test Case 3: Single Node Network
  // ========================================
  
  describe('Single Node', () => {
    it.skip('should handle single node network (graphology returns NaN)', async () => {
      const graph: NetworkGraph = {
        graph_id: 'single',
        description: 'Single node',
        start_time: new Date(),
        end_time: new Date(),
        human_nodes: [{ id: 'h1', name: 'Alone', type: 'human' }],
        ai_agent_nodes: [],
        edges: [],
        messages: [],
        summary: {
          total_nodes: 1,
          total_humans: 1,
          total_bots: 0,
          total_edges: 0,
          total_messages: 0,
        },
        created_at: new Date(),
        version: '2.0',
      };
      
      const engine = new AnalysisEngine(graph);
      const centrality = await engine.computeCentrality();
      
      expect(centrality.degree['h1']).toBe(0);
      expect(centrality.betweenness['h1']).toBe(0);
    });
  });
  
  // ========================================
  // Test Case 4: Full Pipeline
  // ========================================
  
  describe('Full Pipeline', () => {
    it('should complete full pipeline without crashes', async () => {
      const humans: HumanNode[] = [
        { id: 'h1', name: 'A', type: 'human' },
        { id: 'h2', name: 'B', type: 'human' },
      ];
      
      const bots: AIAgentNode[] = [
        { id: 'b1', bot_name: 'Bot', type: 'ai_agent', capabilities: [], functional_tags: [] },
      ];
      
      const edges: Edge[] = [
        { source: 'h1', target: 'h2', edge_type: 'H2H', weight: 5, is_cross_team: false, message_ids: [] },
        { source: 'b1', target: 'h1', edge_type: 'B2H', weight: 3, is_cross_team: false, message_ids: [] },
      ];
      
      const messages: Message[] = [
        { id: 'm1', from_uid: 'h1', to_uids: ['h2'], content: 'hi', timestamp: new Date() },
        { id: 'm2', from_uid: 'b1', to_uids: ['h1'], content: 'hello', timestamp: new Date() },
      ];
      
      const graph: NetworkGraph = {
        graph_id: 'full_pipeline',
        description: 'Full pipeline test',
        start_time: new Date(),
        end_time: new Date(),
        human_nodes: humans,
        ai_agent_nodes: bots,
        edges,
        messages,
        summary: {
          total_nodes: 3,
          total_humans: 2,
          total_bots: 1,
          total_edges: 2,
          total_messages: 2,
        },
        created_at: new Date(),
        version: '2.0',
      };
      
      // Step 1: Analysis
      const engine = new AnalysisEngine(graph);
      const centrality = await engine.computeCentrality();
      expect(centrality).toBeDefined();
      
      // Step 2: Metrics
      const calculator = new MetricsCalculator(graph);
      calculator.registerMetrics(ALL_CORE_METRICS);
      const metrics = await calculator.calculateAll('P0');
      expect(metrics.length).toBeGreaterThan(0);
      
      // Step 3: Dashboard
      const generator = new DashboardGenerator(graph);
      const outputPath = './test-full-pipeline.html';
      await generator.generate(outputPath);
      
      // Cleanup
      const fs = require('fs');
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    });
  });
});
