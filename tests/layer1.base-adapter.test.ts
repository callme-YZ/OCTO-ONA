/**
 * Layer 1 BaseAdapter - Unit Tests
 */

import {
  BaseAdapter,
  SourceUser,
  SourceMessage,
  AdapterConfig,
  FilterOptions,
} from '../src/layer1/base-adapter';

// Mock adapter for testing
class MockAdapter extends BaseAdapter {
  private mockUsers: SourceUser[];
  private mockMessages: SourceMessage[];
  
  constructor(
    config: AdapterConfig,
    users: SourceUser[],
    messages: SourceMessage[]
  ) {
    super(config);
    this.mockUsers = users;
    this.mockMessages = messages;
  }
  
  async fetchUsers(): Promise<SourceUser[]> {
    return this.mockUsers;
  }
  
  async fetchMessages(
    startTime?: Date,
    endTime?: Date
  ): Promise<SourceMessage[]> {
    let filtered = this.mockMessages;
    
    if (startTime) {
      filtered = filtered.filter(msg => msg.timestamp >= startTime);
    }
    
    if (endTime) {
      filtered = filtered.filter(msg => msg.timestamp <= endTime);
    }
    
    return filtered;
  }
}

describe('Layer 1: BaseAdapter', () => {
  
  const mockUsers: SourceUser[] = [
    { id: 'h1', name: 'Human 1', is_bot: false, team: 'A' },
    { id: 'h2', name: 'Human 2', is_bot: false, team: 'B' },
    { id: 'b1', name: 'Bot 1', is_bot: true, creator_uid: 'h1' },
  ];
  
  const mockMessages: SourceMessage[] = [
    {
      id: 'msg1',
      from_uid: 'h1',
      to_uids: ['h2'],
      content: 'Hello',
      timestamp: new Date('2026-03-15T10:00:00Z'),
      context_id: 'ch1',
    },
    {
      id: 'msg2',
      from_uid: 'h2',
      to_uids: ['b1'],
      content: 'Test',
      timestamp: new Date('2026-03-15T11:00:00Z'),
      context_id: 'ch1',
    },
    {
      id: 'msg3',
      from_uid: 'b1',
      to_uids: ['h1', 'h2'],
      content: 'Response',
      timestamp: new Date('2026-03-15T12:00:00Z'),
      context_id: 'ch2',
    },
  ];
  
  let adapter: MockAdapter;
  
  beforeEach(() => {
    adapter = new MockAdapter(
      { platform: 'test' },
      mockUsers,
      mockMessages
    );
  });
  
  // ========================================
  // Node Building Tests
  // ========================================
  
  describe('buildNodes', () => {
    it('should separate humans and bots', () => {
      const { humanNodes, aiAgentNodes } = adapter.buildNodes(mockUsers);
      
      expect(humanNodes.length).toBe(2);
      expect(aiAgentNodes.length).toBe(1);
    });
    
    it('should preserve user attributes', () => {
      const { humanNodes, aiAgentNodes } = adapter.buildNodes(mockUsers);
      
      const human1 = humanNodes.find(n => n.id === 'h1');
      expect(human1?.name).toBe('Human 1');
      expect(human1?.team).toBe('A');
      
      const bot1 = aiAgentNodes.find(n => n.id === 'b1');
      expect(bot1?.bot_name).toBe('Bot 1');
      expect(bot1?.creator_uid).toBe('h1');
    });
  });
  
  // ========================================
  // Edge Building Tests
  // ========================================
  
  describe('buildEdges', () => {
    it('should create edges from messages', () => {
      const edges = adapter.buildEdges(mockMessages);
      
      // msg1: h1→h2, msg2: h2→b1, msg3: b1→h1 + b1→h2
      expect(edges.length).toBe(4);
    });
    
    it('should infer edge types correctly', () => {
      adapter.buildNodes(mockUsers); // Build node type map
      const edges = adapter.buildEdges(mockMessages);
      
      const h1_to_h2 = edges.find(e => e.source === 'h1' && e.target === 'h2');
      expect(h1_to_h2?.edge_type).toBe('H2H');
      
      const h2_to_b1 = edges.find(e => e.source === 'h2' && e.target === 'b1');
      expect(h2_to_b1?.edge_type).toBe('H2B');
      
      const b1_to_h1 = edges.find(e => e.source === 'b1' && e.target === 'h1');
      expect(b1_to_h1?.edge_type).toBe('B2H');
    });
    
    it('should count edge weights', () => {
      const messages: SourceMessage[] = [
        ...mockMessages,
        {
          id: 'msg4',
          from_uid: 'h1',
          to_uids: ['h2'],
          content: 'Again',
          timestamp: new Date('2026-03-15T13:00:00Z'),
        },
      ];
      
      adapter.buildNodes(mockUsers);
      const edges = adapter.buildEdges(messages);
      
      const h1_to_h2 = edges.find(e => e.source === 'h1' && e.target === 'h2');
      expect(h1_to_h2?.weight).toBe(2); // msg1 + msg4
    });
  });
  
  // ========================================
  // Filtering Tests
  // ========================================
  
  describe('_filterByUidWhitelist', () => {
    it('should keep messages from whitelisted users', () => {
      const filtered = (adapter as any)._filterByUidWhitelist(
        mockMessages,
        ['h1']
      );
      
      expect(filtered.length).toBe(2); // msg1 (from h1) + msg3 (to h1)
    });
    
    it('should keep messages to whitelisted users', () => {
      const filtered = (adapter as any)._filterByUidWhitelist(
        mockMessages,
        ['b1']
      );
      
      expect(filtered.length).toBe(2); // msg2 (to b1) + msg3 (from b1)
    });
  });
  
  describe('_filterByChannels', () => {
    it('should keep only messages in specified channels', () => {
      const filtered = (adapter as any)._filterByChannels(
        mockMessages,
        ['ch1']
      );
      
      expect(filtered.length).toBe(2); // msg1 + msg2
    });
  });
  
  // ========================================
  // toNetworkGraph Tests
  // ========================================
  
  describe('toNetworkGraph', () => {
    it('should create a complete network graph', async () => {
      const graph = await adapter.toNetworkGraph();
      
      expect(graph.human_nodes.length).toBe(2);
      expect(graph.ai_agent_nodes.length).toBe(1);
      expect(graph.edges.length).toBe(4);
      expect(graph.messages?.length).toBe(3);
    });
    
    it('should apply UID whitelist filter', async () => {
      const graph = await adapter.toNetworkGraph({
        uidWhitelist: ['h1'],
      });
      
      expect(graph.messages?.length).toBe(2);
    });
    
    it('should apply channel filter', async () => {
      const graph = await adapter.toNetworkGraph({
        channelIds: ['ch1'],
      });
      
      expect(graph.messages?.length).toBe(2);
    });
    
    it('should apply time range filter', async () => {
      const graph = await adapter.toNetworkGraph({
        startTime: new Date('2026-03-15T11:30:00Z'),
      });
      
      expect(graph.messages?.length).toBe(1); // Only msg3
    });
    
    it('should populate summary statistics', async () => {
      const graph = await adapter.toNetworkGraph();
      
      expect(graph.summary.total_nodes).toBe(3);
      expect(graph.summary.total_humans).toBe(2);
      expect(graph.summary.total_bots).toBe(1);
      expect(graph.summary.total_edges).toBe(4);
      expect(graph.summary.total_messages).toBe(3);
    });
  });
});
