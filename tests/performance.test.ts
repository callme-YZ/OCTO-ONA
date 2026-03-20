/**
 * Performance Tests
 * 
 * Tests framework performance with different network sizes.
 */

import { NetworkGraph, HumanNode, AIAgentNode, Edge, Message } from '../src/layer2/models';
import { AnalysisEngine } from '../src/layer3/analysis-engine';
import { MetricsCalculator } from '../src/layer4/metrics-calculator';
import { ALL_CORE_METRICS } from '../src/layer4/core-metrics';
import { DashboardGenerator } from '../src/layer6/dashboard-generator';

// ============================================
// Test Data Generators
// ============================================

function generateNetwork(nodeCount: number, messageCount: number): NetworkGraph {
  const humanCount = Math.floor(nodeCount * 0.7);
  const botCount = nodeCount - humanCount;
  
  // Generate humans
  const humans: HumanNode[] = [];
  for (let i = 0; i < humanCount; i++) {
    humans.push({
      id: `h${i}`,
      name: `Human${i}`,
      type: 'human',
      team: `Team${i % 3}`, // 3 teams
    });
  }
  
  // Generate bots
  const bots: AIAgentNode[] = [];
  for (let i = 0; i < botCount; i++) {
    bots.push({
      id: `b${i}`,
      bot_name: `Bot${i}`,
      type: 'ai_agent',
      capabilities: [],
      functional_tags: [],
    });
  }
  
  // Generate edges (random connections)
  const edges: Edge[] = [];
  const allNodes = [...humans.map(h => h.id), ...bots.map(b => b.id)];
  
  // Each node connects to ~5 others
  for (let i = 0; i < allNodes.length; i++) {
    const sourceId = allNodes[i];
    const connectionsCount = Math.min(5, allNodes.length - 1);
    
    for (let j = 0; j < connectionsCount; j++) {
      const targetIdx = (i + j + 1) % allNodes.length;
      const targetId = allNodes[targetIdx];
      
      if (sourceId !== targetId) {
        const isH2H = sourceId.startsWith('h') && targetId.startsWith('h');
        const isB2H = sourceId.startsWith('b') && targetId.startsWith('h');
        const isH2B = sourceId.startsWith('h') && targetId.startsWith('b');
        const isB2B = sourceId.startsWith('b') && targetId.startsWith('b');
        
        let edgeType: 'H2H' | 'H2B' | 'B2H' | 'B2B';
        if (isH2H) edgeType = 'H2H';
        else if (isH2B) edgeType = 'H2B';
        else if (isB2H) edgeType = 'B2H';
        else edgeType = 'B2B';
        
        edges.push({
          source: sourceId,
          target: targetId,
          edge_type: edgeType,
          weight: Math.floor(Math.random() * 10) + 1,
          is_cross_team: Math.random() > 0.5,
          message_ids: [],
        });
      }
    }
  }
  
  // Generate messages
  const messages: Message[] = [];
  for (let i = 0; i < messageCount; i++) {
    const fromIdx = Math.floor(Math.random() * allNodes.length);
    const toIdx = (fromIdx + 1) % allNodes.length;
    
    messages.push({
      id: `m${i}`,
      from_uid: allNodes[fromIdx],
      to_uids: [allNodes[toIdx]],
      content: 'test message',
      timestamp: new Date(),
    });
  }
  
  return {
    graph_id: `perf_test_${nodeCount}`,
    description: `Performance test with ${nodeCount} nodes`,
    start_time: new Date('2026-03-01'),
    end_time: new Date('2026-03-18'),
    human_nodes: humans,
    ai_agent_nodes: bots,
    edges,
    messages,
    summary: {
      total_nodes: nodeCount,
      total_humans: humanCount,
      total_bots: botCount,
      total_edges: edges.length,
      total_messages: messageCount,
    },
    created_at: new Date(),
    version: '2.0',
  };
}

// ============================================
// Performance Tests
// ============================================

describe('Performance Tests', () => {
  
  // Increase timeout for performance tests
  jest.setTimeout(60000); // 60 seconds
  
  describe('Small Network (15 nodes)', () => {
    it('should complete full pipeline in <10 seconds', async () => {
      const graph = generateNetwork(15, 1000);
      
      const startTime = Date.now();
      
      // Analysis
      const engine = new AnalysisEngine(graph);
      await engine.computeCentrality();
      
      // Metrics
      const calculator = new MetricsCalculator(graph);
      calculator.registerMetrics(ALL_CORE_METRICS);
      await calculator.calculateAll('P0');
      
      // Dashboard
      const generator = new DashboardGenerator(graph);
      await generator.generate('./perf-small-dashboard.html');
      
      const duration = (Date.now() - startTime) / 1000;
      
      console.log(`Small network: ${duration.toFixed(2)}s`);
      expect(duration).toBeLessThan(10);
      
      // Cleanup
      const fs = require('fs');
      if (fs.existsSync('./perf-small-dashboard.html')) {
        fs.unlinkSync('./perf-small-dashboard.html');
      }
    });
  });
  
  describe('Medium Network (50 nodes)', () => {
    it('should complete analysis in reasonable time', async () => {
      const graph = generateNetwork(50, 5000);
      
      const startTime = Date.now();
      
      // Analysis
      const engine = new AnalysisEngine(graph);
      await engine.computeCentrality();
      
      // Metrics
      const calculator = new MetricsCalculator(graph);
      calculator.registerMetrics(ALL_CORE_METRICS);
      await calculator.calculateAll('P0');
      
      const duration = (Date.now() - startTime) / 1000;
      
      console.log(`Medium network: ${duration.toFixed(2)}s`);
      expect(duration).toBeLessThan(30);
    });
  });
  
  describe('Large Network (200 nodes)', () => {
    it('should handle large network without crash', async () => {
      const graph = generateNetwork(200, 20000);
      
      const startTime = Date.now();
      
      // Analysis
      const engine = new AnalysisEngine(graph);
      await engine.computeCentrality();
      
      // Metrics (subset to save time)
      const calculator = new MetricsCalculator(graph);
      calculator.registerMetric(ALL_CORE_METRICS[0]); // Just L1.1
      await calculator.calculateMetric('L1.1');
      
      const duration = (Date.now() - startTime) / 1000;
      
      console.log(`Large network: ${duration.toFixed(2)}s`);
      expect(duration).toBeLessThan(120); // 2 minutes
    });
  });
  
  describe('Memory Usage', () => {
    it('should not exceed 2GB for medium network', async () => {
      const graph = generateNetwork(50, 5000);
      
      const memBefore = process.memoryUsage().heapUsed;
      
      const engine = new AnalysisEngine(graph);
      await engine.computeCentrality();
      
      const calculator = new MetricsCalculator(graph);
      calculator.registerMetrics(ALL_CORE_METRICS);
      await calculator.calculateAll('P0');
      
      const memAfter = process.memoryUsage().heapUsed;
      const memUsedMB = (memAfter - memBefore) / 1024 / 1024;
      
      console.log(`Memory used: ${memUsedMB.toFixed(2)} MB`);
      expect(memUsedMB).toBeLessThan(2048); // <2GB
    });
  });
});
