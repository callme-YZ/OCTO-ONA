/**
 * Layer 3 AnalysisEngine - Unit Tests
 */

import { AnalysisEngine } from '../src/layer3/analysis-engine';
import { NetworkGraph, HumanNode, AIAgentNode, Edge } from '../src/layer2/models';

describe('Layer 3: AnalysisEngine', () => {
  
  let testGraph: NetworkGraph;
  let engine: AnalysisEngine;
  
  beforeEach(() => {
    // Create test network
    const humans: HumanNode[] = [
      { id: 'h1', name: 'Alice', type: 'human', team: 'A' },
      { id: 'h2', name: 'Bob', type: 'human', team: 'B' },
      { id: 'h3', name: 'Charlie', type: 'human', team: 'A' },
    ];
    
    const bots: AIAgentNode[] = [
      { id: 'b1', bot_name: 'Bot1', type: 'ai_agent', capabilities: [], functional_tags: [] },
    ];
    
    const edges: Edge[] = [
      { source: 'h1', target: 'h2', edge_type: 'H2H', weight: 5, is_cross_team: false, message_ids: [] },
      { source: 'h2', target: 'h3', edge_type: 'H2H', weight: 3, is_cross_team: false, message_ids: [] },
      { source: 'h1', target: 'b1', edge_type: 'H2B', weight: 10, is_cross_team: false, message_ids: [] },
      { source: 'b1', target: 'h2', edge_type: 'B2H', weight: 8, is_cross_team: false, message_ids: [] },
    ];
    
    testGraph = {
      graph_id: 'test',
      description: 'Test network',
      start_time: new Date('2026-03-01'),
      end_time: new Date('2026-03-18'),
      human_nodes: humans,
      ai_agent_nodes: bots,
      edges,
      summary: {
        total_nodes: 4,
        total_humans: 3,
        total_bots: 1,
        total_edges: 4,
        total_messages: 26,
      },
      created_at: new Date(),
      version: '2.0',
    };
    
    engine = new AnalysisEngine(testGraph);
  });
  
  // ========================================
  // Graph Construction Tests
  // ========================================
  
  describe('Graph Construction', () => {
    it('should create graphology graph from NetworkGraph', () => {
      const stats = engine.getGraphStats();
      
      expect(stats.nodes).toBe(4);
      expect(stats.edges).toBe(4);
    });
    
    it('should calculate network density', () => {
      const stats = engine.getGraphStats();
      
      // 4 nodes → max 4*3 = 12 edges (directed)
      // Actual: 4 edges
      // Density: 4/12 = 0.33
      expect(stats.density).toBeCloseTo(0.33, 2);
    });
  });
  
  // ========================================
  // Centrality Tests
  // ========================================
  
  describe('Centrality Metrics', () => {
    it('should compute degree centrality', async () => {
      const centrality = await engine.computeCentrality();
      
      expect(centrality.degree).toBeDefined();
      expect(Object.keys(centrality.degree).length).toBe(4);
      
      // h1: 2 edges (h1→h2, h1→b1)
      // h2: 2 edges (h2→h3, b1→h2)
      // Check non-zero
      expect(centrality.degree['h1']).toBeGreaterThan(0);
    });
    
    it('should compute betweenness centrality', async () => {
      const centrality = await engine.computeCentrality();
      
      expect(centrality.betweenness).toBeDefined();
      expect(Object.keys(centrality.betweenness).length).toBe(4);
    });
    
    it('should compute closeness centrality', async () => {
      const centrality = await engine.computeCentrality();
      
      expect(centrality.closeness).toBeDefined();
      expect(Object.keys(centrality.closeness).length).toBe(4);
    });
    
    it('should cache centrality results', async () => {
      const result1 = await engine.computeCentrality();
      const result2 = await engine.computeCentrality();
      
      expect(result1).toBe(result2); // Same object reference
    });
  });
  
  // ========================================
  // Top Nodes Tests
  // ========================================
  
  describe('Top Nodes', () => {
    it('should return top nodes by degree', async () => {
      const top = await engine.getTopNodes('degree', 2);
      
      expect(top.length).toBeLessThanOrEqual(2);
      expect(top[0][1]).toBeGreaterThanOrEqual(top[1][1]); // Sorted descending
    });
    
    it('should return top nodes by betweenness', async () => {
      const top = await engine.getTopNodes('betweenness', 3);
      
      expect(top.length).toBeLessThanOrEqual(3);
    });
  });
  
  // ========================================
  // Cache Management Tests
  // ========================================
  
  describe('Cache Management', () => {
    it('should clear cache', async () => {
      await engine.computeCentrality();
      engine.clearCache();
      
      const centrality = await engine.computeCentrality();
      expect(centrality).toBeDefined();
    });
  });
});
