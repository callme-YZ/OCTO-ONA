/**
 * NetworkGraphBuilder Tests
 */

import { describe, it, expect } from '@jest/globals';
import { NetworkGraphBuilder } from '../src/layer1/network-graph-builder';

describe('NetworkGraphBuilder', () => {
  describe('separateUsers', () => {
    it('should separate humans and bots correctly', () => {
      const users = [
        { id: 'h1', name: 'Alice', is_bot: false },
        { id: 'b1', name: 'Bot1', is_bot: true },
        { id: 'h2', name: 'Bob', is_bot: false },
      ];
      
      const { humans, bots } = NetworkGraphBuilder.separateUsers(users);
      
      expect(humans).toHaveLength(2);
      expect(bots).toHaveLength(1);
      expect(humans[0].id).toBe('h1');
      expect(humans[0].name).toBe('Alice');
      expect(bots[0].id).toBe('b1');
      expect(bots[0].bot_name).toBe('Bot1');
    });
    
    it('should handle empty input', () => {
      const { humans, bots } = NetworkGraphBuilder.separateUsers([]);
      expect(humans).toHaveLength(0);
      expect(bots).toHaveLength(0);
    });
    
    it('should handle only humans', () => {
      const users = [
        { id: 'h1', name: 'Alice', is_bot: false },
        { id: 'h2', name: 'Bob', is_bot: false },
      ];
      
      const { humans, bots } = NetworkGraphBuilder.separateUsers(users);
      
      expect(humans).toHaveLength(2);
      expect(bots).toHaveLength(0);
    });
    
    it('should handle only bots', () => {
      const users = [
        { id: 'b1', name: 'Bot1', is_bot: true },
        { id: 'b2', name: 'Bot2', is_bot: true },
      ];
      
      const { humans, bots } = NetworkGraphBuilder.separateUsers(users);
      
      expect(humans).toHaveLength(0);
      expect(bots).toHaveLength(2);
    });
    
    it('should preserve optional fields', () => {
      const users = [
        { id: 'h1', name: 'Alice', is_bot: false, team: 'team-a', role: 'engineer' },
        { id: 'b1', name: 'Bot1', is_bot: true, creator_uid: 'h1' },
      ];
      
      const { humans, bots } = NetworkGraphBuilder.separateUsers(users);
      
      expect(humans[0].team).toBe('team-a');
      expect(humans[0].role).toBe('engineer');
      expect(bots[0].creator_uid).toBe('h1');
    });
  });
  
  describe('buildEdges', () => {
    it('should build edges from messages', () => {
      const messages = [
        { id: 'm1', from: 'u1', to: ['u2'], timestamp: new Date() },
        { id: 'm2', from: 'u1', to: ['u2'], timestamp: new Date() },
        { id: 'm3', from: 'u2', to: ['u3'], timestamp: new Date() },
      ];
      
      const humanIds = new Set(['u1', 'u2', 'u3']);
      const botIds = new Set<string>();
      
      const edges = NetworkGraphBuilder.buildEdges(messages, humanIds, botIds);
      
      expect(edges.length).toBeGreaterThan(0);
      
      const edge12 = edges.find(e => e.source === 'u1' && e.target === 'u2');
      expect(edge12).toBeDefined();
      expect(edge12!.weight).toBe(2);
      expect(edge12!.edge_type).toBe('H2H');
    });
    
    it('should handle empty messages', () => {
      const humanIds = new Set<string>();
      const botIds = new Set<string>();
      
      const edges = NetworkGraphBuilder.buildEdges([], humanIds, botIds);
      expect(edges).toHaveLength(0);
    });
    
    it('should handle messages with multiple targets', () => {
      const messages = [
        { id: 'm1', from: 'u1', to: ['u2', 'u3'], timestamp: new Date() },
      ];
      
      const humanIds = new Set(['u1', 'u2', 'u3']);
      const botIds = new Set<string>();
      
      const edges = NetworkGraphBuilder.buildEdges(messages, humanIds, botIds);
      
      expect(edges).toHaveLength(2);
      expect(edges.find(e => e.source === 'u1' && e.target === 'u2')).toBeDefined();
      expect(edges.find(e => e.source === 'u1' && e.target === 'u3')).toBeDefined();
    });
    
    it('should determine edge types correctly', () => {
      const messages = [
        { id: 'm1', from: 'h1', to: ['h2'], timestamp: new Date() },
        { id: 'm2', from: 'h1', to: ['b1'], timestamp: new Date() },
        { id: 'm3', from: 'b1', to: ['h1'], timestamp: new Date() },
        { id: 'm4', from: 'b1', to: ['b2'], timestamp: new Date() },
      ];
      
      const humanIds = new Set(['h1', 'h2']);
      const botIds = new Set(['b1', 'b2']);
      
      const edges = NetworkGraphBuilder.buildEdges(messages, humanIds, botIds);
      
      const h2h = edges.find(e => e.source === 'h1' && e.target === 'h2');
      const h2b = edges.find(e => e.source === 'h1' && e.target === 'b1');
      const b2h = edges.find(e => e.source === 'b1' && e.target === 'h1');
      const b2b = edges.find(e => e.source === 'b1' && e.target === 'b2');
      
      expect(h2h!.edge_type).toBe('H2H');
      expect(h2b!.edge_type).toBe('H2B');
      expect(b2h!.edge_type).toBe('B2H');
      expect(b2b!.edge_type).toBe('B2B');
    });
  });
  
  describe('markCrossTeamEdges', () => {
    it('should mark cross-team edges', () => {
      const edges: any[] = [
        {
          source: 'u1',
          target: 'u2',
          edge_type: 'H2H' as const,
          weight: 1,
          is_cross_team: false,
          message_ids: [],
        },
        {
          source: 'u1',
          target: 'u3',
          edge_type: 'H2H' as const,
          weight: 1,
          is_cross_team: false,
          message_ids: [],
        },
      ];
      
      const teamMap = new Map([
        ['u1', 'team-a'],
        ['u2', 'team-a'],
        ['u3', 'team-b'],
      ]);
      
      const marked = NetworkGraphBuilder.markCrossTeamEdges(edges, teamMap);
      
      expect(marked[0].is_cross_team).toBe(false);
      expect(marked[1].is_cross_team).toBe(true);
    });
    
    it('should handle missing team info', () => {
      const edges: any[] = [
        {
          source: 'u1',
          target: 'u2',
          edge_type: 'H2H' as const,
          weight: 1,
          is_cross_team: false,
          message_ids: [],
        },
      ];
      
      const teamMap = new Map([['u1', 'team-a']]);
      
      const marked = NetworkGraphBuilder.markCrossTeamEdges(edges, teamMap);
      
      expect(marked[0].is_cross_team).toBe(false);
    });
    
    it('should handle empty team map', () => {
      const edges: any[] = [
        {
          source: 'u1',
          target: 'u2',
          edge_type: 'H2H' as const,
          weight: 1,
          is_cross_team: false,
          message_ids: [],
        },
      ];
      
      const marked = NetworkGraphBuilder.markCrossTeamEdges(edges, new Map());
      
      expect(marked[0].is_cross_team).toBe(false);
    });
  });
  
  describe('build', () => {
    it('should build complete NetworkGraph', () => {
      const graph = NetworkGraphBuilder.build({
        graphId: 'test-graph',
        description: 'Test Network',
        startTime: new Date('2026-01-01'),
        endTime: new Date('2026-01-10'),
        humans: [
          { id: 'h1', name: 'Alice', type: 'human' },
        ],
        bots: [
          { id: 'b1', type: 'ai_agent', bot_name: 'Bot1', capabilities: [], functional_tags: [] },
        ],
        edges: [
          {
            source: 'h1',
            target: 'b1',
            edge_type: 'H2B',
            weight: 1,
            is_cross_team: false,
            message_ids: ['m1'],
          },
        ],
        messages: [
          {
            id: 'm1',
            from_uid: 'h1',
            to_uids: ['b1'],
            content: 'Hello',
            timestamp: new Date('2026-01-01'),
          },
        ],
      });
      
      expect(graph.graph_id).toBe('test-graph');
      expect(graph.description).toBe('Test Network');
      expect(graph.human_nodes).toHaveLength(1);
      expect(graph.ai_agent_nodes).toHaveLength(1);
      expect(graph.edges).toHaveLength(1);
      expect(graph.summary.total_nodes).toBe(2);
      expect(graph.summary.total_humans).toBe(1);
      expect(graph.summary.total_bots).toBe(1);
      expect(graph.summary.total_edges).toBe(1);
      expect(graph.summary.total_messages).toBe(1);
    });
    
    it('should handle empty graph', () => {
      const graph = NetworkGraphBuilder.build({
        graphId: 'empty-graph',
        description: 'Empty Network',
        startTime: new Date('2026-01-01'),
        endTime: new Date('2026-01-01'),
        humans: [],
        bots: [],
        edges: [],
        messages: [],
      });
      
      expect(graph.summary.total_nodes).toBe(0);
      expect(graph.summary.total_edges).toBe(0);
      expect(graph.summary.total_messages).toBe(0);
    });
  });
});
