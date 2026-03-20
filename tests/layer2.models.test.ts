/**
 * Layer 2 Models - Unit Tests
 */

import {
  HumanNodeSchema,
  AIAgentNodeSchema,
  EdgeSchema,
  MessageSchema,
  NetworkGraphSchema,
  createEmptyGraph,
  getAllNodes,
  getNodeById,
  getNodeSummary,
  getAllParticipants,
  type HumanNode,
  type AIAgentNode,
  type Edge,
  type Message,
  type NetworkGraph,
} from '../src/layer2/models';

describe('Layer 2: Data Models', () => {
  
  // ========================================
  // HumanNode Tests
  // ========================================
  
  describe('HumanNode', () => {
    it('should create a valid human node', () => {
      const node: HumanNode = {
        id: 'user_001',
        name: 'Alice',
        role: 'Product Owner',
        team: '产品',
        type: 'human',
      };
      
      const result = HumanNodeSchema.safeParse(node);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid email', () => {
      const node = {
        id: 'user_001',
        name: 'Alice',
        email: 'invalid-email',
        type: 'human',
      };
      
      const result = HumanNodeSchema.safeParse(node);
      expect(result.success).toBe(false);
    });
    
    it('should accept minimal required fields', () => {
      const node = {
        id: 'user_002',
        name: '张三',
      };
      
      const result = HumanNodeSchema.safeParse(node);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('human');
      }
    });
  });
  
  // ========================================
  // AIAgentNode Tests
  // ========================================
  
  describe('AIAgentNode', () => {
    it('should create a valid AI agent node', () => {
      const node: AIAgentNode = {
        id: 'wuyun_bot',
        bot_name: '无云',
        creator_uid: 'user_001',
        capabilities: ['code_review', 'testing'],
        functional_tags: ['跨团队连接', '信息聚合'],
        avg_response_time: 8.5,
        type: 'ai_agent',
      };
      
      const result = AIAgentNodeSchema.safeParse(node);
      expect(result.success).toBe(true);
    });
    
    it('should default empty arrays', () => {
      const node = {
        id: 'bot_001',
        bot_name: 'Test Bot',
      };
      
      const result = AIAgentNodeSchema.safeParse(node);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.capabilities).toEqual([]);
        expect(result.data.functional_tags).toEqual([]);
        expect(result.data.type).toBe('ai_agent');
      }
    });
  });
  
  // ========================================
  // Edge Tests
  // ========================================
  
  describe('Edge', () => {
    it('should create a valid edge', () => {
      const edge: Edge = {
        source: 'user_001',
        target: 'wuyun_bot',
        edge_type: 'H2B',
        weight: 156,
        is_cross_team: false,
        message_ids: [],
      };
      
      const result = EdgeSchema.safeParse(edge);
      expect(result.success).toBe(true);
    });
    
    it('should validate edge_type enum', () => {
      const edge = {
        source: 'user_001',
        target: 'user_002',
        edge_type: 'INVALID',
      };
      
      const result = EdgeSchema.safeParse(edge);
      expect(result.success).toBe(false);
    });
    
    it('should default weight and arrays', () => {
      const edge = {
        source: 'user_001',
        target: 'user_002',
        edge_type: 'H2H',
      };
      
      const result = EdgeSchema.safeParse(edge);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.weight).toBe(1);
        expect(result.data.message_ids).toEqual([]);
      }
    });
  });
  
  // ========================================
  // Message Tests
  // ========================================
  
  describe('Message', () => {
    it('should create a valid message', () => {
      const message: Message = {
        id: 'msg_001',
        from_uid: 'user_001',
        to_uids: ['wuyun_bot'],
        content: '这个UI排版有问题',
        timestamp: new Date('2026-03-15T14:30:00Z'),
        platform: 'dmwork',
        context_id: 'ch_product_team',
      };
      
      const result = MessageSchema.safeParse(message);
      expect(result.success).toBe(true);
    });
    
    it('should support multiple recipients', () => {
      const message = {
        id: 'msg_002',
        from_uid: 'user_001',
        to_uids: ['user_002', 'wuyun_bot', 'user_003'],
        content: '@all please review',
        timestamp: new Date(),
      };
      
      const result = MessageSchema.safeParse(message);
      expect(result.success).toBe(true);
    });
  });
  
  // ========================================
  // NetworkGraph Tests
  // ========================================
  
  describe('NetworkGraph', () => {
    it('should create an empty graph', () => {
      const graph = createEmptyGraph(
        'test_graph',
        'Test network',
        new Date('2026-03-01'),
        new Date('2026-03-18')
      );
      
      expect(graph.graph_id).toBe('test_graph');
      expect(graph.human_nodes).toEqual([]);
      expect(graph.ai_agent_nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });
    
    it('should validate a complete graph', () => {
      const graph: NetworkGraph = {
        graph_id: 'octo_2026_03',
        description: 'Octo team ONA',
        start_time: new Date('2026-03-01'),
        end_time: new Date('2026-03-18'),
        human_nodes: [
          { id: 'user_001', name: 'Alice', type: 'human' },
        ],
        ai_agent_nodes: [
          { id: 'wuyun_bot', bot_name: '无云', type: 'ai_agent', capabilities: [], functional_tags: [] },
        ],
        edges: [
          { source: 'user_001', target: 'wuyun_bot', edge_type: 'H2B', weight: 10, is_cross_team: false, message_ids: [] },
        ],
        summary: { total_messages: 100 },
        created_at: new Date(),
        version: '2.0',
      };
      
      const result = NetworkGraphSchema.safeParse(graph);
      expect(result.success).toBe(true);
    });
  });
  
  // ========================================
  // Helper Functions Tests
  // ========================================
  
  describe('Helper Functions', () => {
    let graph: NetworkGraph;
    
    beforeEach(() => {
      graph = createEmptyGraph(
        'test',
        'Test',
        new Date('2026-03-01'),
        new Date('2026-03-18')
      );
      
      graph.human_nodes = [
        { id: 'h1', name: 'Human 1', type: 'human' },
        { id: 'h2', name: 'Human 2', type: 'human' },
      ];
      
      graph.ai_agent_nodes = [
        { id: 'b1', bot_name: 'Bot 1', type: 'ai_agent', capabilities: [], functional_tags: [] },
      ];
    });
    
    it('getAllNodes should return all nodes', () => {
      const nodes = getAllNodes(graph);
      expect(nodes.length).toBe(3);
    });
    
    it('getNodeById should find human node', () => {
      const node = getNodeById(graph, 'h1');
      expect(node).toBeDefined();
      if (node && 'name' in node) {
        expect(node.name).toBe('Human 1');
      }
    });
    
    it('getNodeById should return undefined for unknown ID', () => {
      const node = getNodeById(graph, 'unknown');
      expect(node).toBeUndefined();
    });
    
    it('getNodeSummary should count nodes', () => {
      const summary = getNodeSummary(graph);
      expect(summary.total).toBe(3);
      expect(summary.humans).toBe(2);
      expect(summary.bots).toBe(1);
    });
    
    it('getAllParticipants should return sender + receivers', () => {
      const message: Message = {
        id: 'msg_001',
        from_uid: 'h1',
        to_uids: ['h2', 'b1'],
        content: 'Test',
        timestamp: new Date(),
      };
      
      const participants = getAllParticipants(message);
      expect(participants).toEqual(['h1', 'h2', 'b1']);
    });
  });
});
