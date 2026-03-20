/**
 * Layer 3 AnalysisEngine - Unit Tests
 */

import { AnalysisEngine } from '../src/layer3/analysis-engine';
import { NetworkGraph, HumanNode, AIAgentNode, Edge, Message } from '../src/layer2/models';

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
  
  // ========================================
  // Hub Score Tests
  // ========================================
  
  describe('Hub Score', () => {
    let hubTestGraph: NetworkGraph;
    let hubEngine: AnalysisEngine;
    
    beforeEach(() => {
      // Create network with known Hub Scores
      // Simple test data with clear Hub Scores
      const humans: HumanNode[] = [
        { id: 'authority', name: 'Charlie', type: 'human' }, // HS = ∞ (0 sent, 5 received)
        { id: 'strategist', name: 'Bob', type: 'human' }, // HS = 2.0 (2 sent, 4 received)
        { id: 'manager', name: 'Alice', type: 'human' }, // HS = 0.5 (10 sent, 5 received)
        { id: 'executor', name: 'David', type: 'human' }, // HS = 0.1 (10 sent, 1 received)
      ];
      
      const bots: AIAgentNode[] = [];
      const edges: Edge[] = [];
      
      const messages: Message[] = [
        // authority: 0 sent, 5 received → HS = ∞
        { id: 'm1', from_uid: 'strategist', to_uids: ['authority'], content: '@Charlie', timestamp: new Date() },
        { id: 'm2', from_uid: 'strategist', to_uids: ['authority'], content: '@Charlie', timestamp: new Date() },
        { id: 'm3', from_uid: 'manager', to_uids: ['authority'], content: '@Charlie', timestamp: new Date() },
        { id: 'm4', from_uid: 'manager', to_uids: ['authority'], content: '@Charlie', timestamp: new Date() },
        { id: 'm5', from_uid: 'manager', to_uids: ['authority'], content: '@Charlie', timestamp: new Date() },
        
        // strategist: 2 sent (m1, m2), 4 received (m6-m9) → HS = 2.0
        { id: 'm6', from_uid: 'manager', to_uids: ['strategist'], content: '@Bob', timestamp: new Date() },
        { id: 'm7', from_uid: 'manager', to_uids: ['strategist'], content: '@Bob', timestamp: new Date() },
        { id: 'm8', from_uid: 'executor', to_uids: ['strategist'], content: '@Bob', timestamp: new Date() },
        { id: 'm9', from_uid: 'executor', to_uids: ['strategist'], content: '@Bob', timestamp: new Date() },
        
        // manager: 10 sent (m3-m5, m6-m7, m10-m14), 5 received (m15-m19) → HS = 0.5
        { id: 'm10', from_uid: 'manager', to_uids: ['executor'], content: '工作', timestamp: new Date() },
        { id: 'm11', from_uid: 'manager', to_uids: ['executor'], content: '工作', timestamp: new Date() },
        { id: 'm12', from_uid: 'manager', to_uids: ['executor'], content: '工作', timestamp: new Date() },
        { id: 'm13', from_uid: 'manager', to_uids: ['executor'], content: '工作', timestamp: new Date() },
        { id: 'm14', from_uid: 'manager', to_uids: ['executor'], content: '工作', timestamp: new Date() },
        { id: 'm15', from_uid: 'executor', to_uids: ['manager'], content: '@Alice', timestamp: new Date() },
        { id: 'm16', from_uid: 'executor', to_uids: ['manager'], content: '@Alice', timestamp: new Date() },
        { id: 'm17', from_uid: 'executor', to_uids: ['manager'], content: '@Alice', timestamp: new Date() },
        { id: 'm18', from_uid: 'executor', to_uids: ['manager'], content: '@Alice', timestamp: new Date() },
        { id: 'm19', from_uid: 'executor', to_uids: ['manager'], content: '@Alice', timestamp: new Date() },
        
        // executor: 10 sent (m8-m9, m15-m19, m20-m22), 1 received (m10) → HS = 0.1
        { id: 'm20', from_uid: 'executor', to_uids: ['manager'], content: '报告', timestamp: new Date() },
        { id: 'm21', from_uid: 'executor', to_uids: ['manager'], content: '报告', timestamp: new Date() },
        { id: 'm22', from_uid: 'executor', to_uids: ['manager'], content: '报告', timestamp: new Date() },
      ];
      
      hubTestGraph = {
        graph_id: 'hub_test',
        description: 'Hub Score test',
        start_time: new Date('2026-03-01'),
        end_time: new Date('2026-03-18'),
        human_nodes: humans,
        ai_agent_nodes: bots,
        edges,
        messages,
        summary: {
          total_nodes: 4,
          total_humans: 4,
          total_bots: 0,
          total_edges: 0,
          total_messages: messages.length,
        },
        created_at: new Date(),
        version: '2.0',
      };
      
      hubEngine = new AnalysisEngine(hubTestGraph);
    });
    
    it('should calculate Hub Score = Infinity for pure authority', () => {
      const hubScores = hubEngine.calculateHubScore();
      
      expect(hubScores['authority']).toBe(Infinity);
    });
    
    it('should calculate Hub Score = 2.0 for strategist', () => {
      const hubScores = hubEngine.calculateHubScore();
      
      expect(hubScores['strategist']).toBeCloseTo(2.0, 1);
    });
    
    it('should calculate Hub Score correctly for manager', () => {
      const hubScores = hubEngine.calculateHubScore();
      
      // manager sent 10, received 8 → HS = 0.8
      expect(hubScores['manager']).toBeCloseTo(0.8, 1);
    });
    
    it('should calculate Hub Score correctly for executor', () => {
      const hubScores = hubEngine.calculateHubScore();
      
      // executor sent 10, received 5 → HS = 0.5
      expect(hubScores['executor']).toBeCloseTo(0.5, 1);
    });
    
    it('should classify layers correctly', () => {
      expect(hubEngine.classifyConnoisseurLayer(Infinity)).toBe('L4_技术裁判');
      expect(hubEngine.classifyConnoisseurLayer(5.0)).toBe('L5_战略权威');
      expect(hubEngine.classifyConnoisseurLayer(2.0)).toBe('L2_主动管理');
      expect(hubEngine.classifyConnoisseurLayer(0.3)).toBe('L2_主动管理');
      expect(hubEngine.classifyConnoisseurLayer(0.02)).toBe('L1_纯执行');
      expect(hubEngine.classifyConnoisseurLayer(0)).toBe('L0_无活动');
    });
    
    it('should return top Hub Scores sorted correctly', () => {
      const top = hubEngine.getTopHubScores(4);
      
      expect(top.length).toBe(4);
      // Infinity should be first
      expect(top[0][0]).toBe('authority');
      expect(top[0][1]).toBe(Infinity);
      expect(top[0][2]).toBe('L4_技术裁判');
      
      // Then 2.0
      expect(top[1][0]).toBe('strategist');
      expect(top[1][1]).toBeCloseTo(2.0, 1);
    });
    
    it('should provide Hub Score details', () => {
      const details = hubEngine.getHubScoreDetails('authority');
      
      expect(details).not.toBeNull();
      expect(details!.hubScore).toBe(Infinity);
      expect(details!.mentionsReceived).toBe(5);
      expect(details!.messagesSent).toBe(0);
      expect(details!.layer).toBe('L4_技术裁判');
    });
  });
  
  // ========================================
  // Connoisseurship Detection Tests
  // ========================================
  
  describe('Connoisseurship Detection', () => {
    let connoisseurGraph: NetworkGraph;
    let connoisseurEngine: AnalysisEngine;
    
    beforeEach(() => {
      const humans: HumanNode[] = [
        { id: 'user1', name: 'David', type: 'human' },
        { id: 'user2', name: 'User2', type: 'human' },
      ];
      
      const messages: Message[] = [
        // user1: 4 messages, 3 connoisseurship (75% frequency)
        { id: 'm1', from_uid: 'user1', to_uids: ['user2'], content: '感觉这个设计不对，为什么要这样？', timestamp: new Date() }, // eval+crit=2
        { id: 'm2', from_uid: 'user1', to_uids: ['user2'], content: 'UI很优雅流畅', timestamp: new Date() }, // taste=2
        { id: 'm3', from_uid: 'user1', to_uids: ['user2'], content: '今天开会', timestamp: new Date() }, // 0
        { id: 'm4', from_uid: 'user1', to_uids: ['user2'], content: '觉得没有飞书好用', timestamp: new Date() }, // eval+comp=2
        
        // user2: 2 messages, 0 connoisseurship (0% frequency)
        { id: 'm5', from_uid: 'user2', to_uids: ['user1'], content: '收到', timestamp: new Date() },
        { id: 'm6', from_uid: 'user2', to_uids: ['user1'], content: '好的', timestamp: new Date() },
      ];
      
      connoisseurGraph = {
        graph_id: 'connoisseur_test',
        description: 'Connoisseurship test',
        start_time: new Date('2026-03-01'),
        end_time: new Date('2026-03-18'),
        human_nodes: humans,
        ai_agent_nodes: [],
        edges: [],
        messages,
        summary: {
          total_nodes: 2,
          total_humans: 2,
          total_bots: 0,
          total_edges: 0,
          total_messages: messages.length,
        },
        created_at: new Date(),
        version: '2.0',
      };
      
      connoisseurEngine = new AnalysisEngine(connoisseurGraph);
    });
    
    it('should detect connoisseurship messages', () => {
      const connoisseurshipIds = connoisseurEngine.detectConnoisseurshipMessages();
      
      expect(connoisseurshipIds.length).toBeGreaterThan(0);
      expect(connoisseurshipIds.length).toBeLessThan(6); // Not all messages
    });
    
    it('should calculate connoisseurship frequency per user', () => {
      const frequencies = connoisseurEngine.calculateConnoisseurshipFrequency();
      
      expect(frequencies['user1']).toBeGreaterThan(0.5); // High frequency
      expect(frequencies['user2']).toBe(0); // No connoisseurship
    });
    
    it('should return top connoisseurs', () => {
      const top = connoisseurEngine.getTopConnoisseurs(2);
      
      expect(top.length).toBe(2);
      expect(top[0][0]).toBe('user1'); // user1 first (higher frequency)
      expect(top[0][1]).toBeGreaterThan(top[1][1]); // Sorted descending
    });
  });
  
  // ========================================
  // Advanced Algorithms Tests
  // ========================================
  
  describe('Advanced Algorithms', () => {
    let advancedGraph: NetworkGraph;
    let advancedEngine: AnalysisEngine;
    
    beforeEach(() => {
      // Create network with clear community structure
      // Community 1: h1-h2 + b1 (3 nodes)
      // Community 2: h3-h4 (2 nodes)
      const humans: HumanNode[] = [
        { id: 'h1', name: 'Alice', type: 'human', team: 'A' },
        { id: 'h2', name: 'Bob', type: 'human', team: 'A' },
        { id: 'h3', name: 'Charlie', type: 'human', team: 'B' },
        { id: 'h4', name: 'David', type: 'human', team: 'B' },
      ];
      
      const bots: AIAgentNode[] = [
        { id: 'b1', bot_name: 'Bot1', type: 'ai_agent', capabilities: [], functional_tags: [] },
      ];
      
      const edges: Edge[] = [
        // Community 1 (densely connected)
        { source: 'h1', target: 'h2', edge_type: 'H2H', weight: 10, is_cross_team: false, message_ids: [] },
        { source: 'h2', target: 'h1', edge_type: 'H2H', weight: 10, is_cross_team: false, message_ids: [] },
        { source: 'h1', target: 'b1', edge_type: 'H2B', weight: 5, is_cross_team: false, message_ids: [] },
        { source: 'h2', target: 'b1', edge_type: 'H2B', weight: 5, is_cross_team: false, message_ids: [] },
        
        // Community 2 (densely connected)
        { source: 'h3', target: 'h4', edge_type: 'H2H', weight: 8, is_cross_team: false, message_ids: [] },
        { source: 'h4', target: 'h3', edge_type: 'H2H', weight: 8, is_cross_team: false, message_ids: [] },
        
        // Weak cross-community link
        { source: 'h2', target: 'h3', edge_type: 'H2H', weight: 1, is_cross_team: true, message_ids: [] },
      ];
      
      advancedGraph = {
        graph_id: 'advanced_test',
        description: 'Community detection test',
        start_time: new Date('2026-03-01'),
        end_time: new Date('2026-03-18'),
        human_nodes: humans,
        ai_agent_nodes: bots,
        edges,
        summary: {
          total_nodes: 5,
          total_humans: 4,
          total_bots: 1,
          total_edges: edges.length,
          total_messages: 0,
        },
        created_at: new Date(),
        version: '2.0',
      };
      
      advancedEngine = new AnalysisEngine(advancedGraph);
    });
    
    it('should detect communities using Louvain', () => {
      const communities = advancedEngine.detectCommunities();
      
      expect(Object.keys(communities).length).toBe(5); // All nodes assigned
      
      // Check that nodes are grouped (exact communities may vary)
      const communityIds = new Set(Object.values(communities));
      expect(communityIds.size).toBeGreaterThan(0);
      expect(communityIds.size).toBeLessThanOrEqual(5);
    });
    
    it('should provide community summary', () => {
      const summary = advancedEngine.getCommunitySummary();
      
      expect(summary.length).toBeGreaterThan(0);
      
      // Sorted by size descending
      for (let i = 1; i < summary.length; i++) {
        expect(summary[i - 1].size).toBeGreaterThanOrEqual(summary[i].size);
      }
      
      // Each community has members
      for (const community of summary) {
        expect(community.members.length).toBeGreaterThan(0);
        expect(community.size).toBe(community.members.length);
        expect(community.humanCount + community.botCount).toBe(community.size);
      }
    });
  });
});
