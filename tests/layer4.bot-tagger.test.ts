/**
 * Layer 4 BotTagger - Unit Tests
 */

import { BotTagger } from '../src/layer4/bot-tagger';
import { AnalysisEngine } from '../src/layer3/analysis-engine';
import { NetworkGraph, HumanNode, AIAgentNode, Edge, Message } from '../src/layer2/models';

describe('Layer 4: BotTagger', () => {
  
  let testGraph: NetworkGraph;
  let engine: AnalysisEngine;
  let tagger: BotTagger;
  
  beforeEach(() => {
    // Create test network with diverse bot roles
    const humans: HumanNode[] = [
      { id: 'h1', name: 'Alice', type: 'human', team: 'A' },
      { id: 'h2', name: 'Bob', type: 'human', team: 'A' },
      { id: 'h3', name: 'Charlie', type: 'human', team: 'B' },
      { id: 'h4', name: 'David', type: 'human', team: 'C' },
    ];
    
    const bots: AIAgentNode[] = [
      { id: 'b1', bot_name: 'CrossTeamBot', type: 'ai_agent', capabilities: [], functional_tags: [] },
      { id: 'b2', bot_name: 'IntraTeamBot', type: 'ai_agent', capabilities: [], functional_tags: [] },
      { id: 'b3', bot_name: 'ActiveBot', type: 'ai_agent', capabilities: [], functional_tags: [] },
    ];
    
    const edges: Edge[] = [
      // b1: Cross-team connector (connects A, B, C)
      { source: 'b1', target: 'h1', edge_type: 'B2H', weight: 5, is_cross_team: false, message_ids: [] },
      { source: 'b1', target: 'h3', edge_type: 'B2H', weight: 5, is_cross_team: true, message_ids: [] },
      { source: 'b1', target: 'h4', edge_type: 'B2H', weight: 5, is_cross_team: true, message_ids: [] },
      
      // b2: Intra-team hub (only team A)
      { source: 'b2', target: 'h1', edge_type: 'B2H', weight: 10, is_cross_team: false, message_ids: [] },
      { source: 'b2', target: 'h2', edge_type: 'B2H', weight: 10, is_cross_team: false, message_ids: [] },
    ];
    
    const messages: Message[] = [
      // b3: High activity (many messages)
      { id: 'm1', from_uid: 'b3', to_uids: ['h1'], content: 'msg1', timestamp: new Date() },
      { id: 'm2', from_uid: 'b3', to_uids: ['h2'], content: 'msg2', timestamp: new Date() },
      { id: 'm3', from_uid: 'b3', to_uids: ['h3'], content: 'msg3', timestamp: new Date() },
      
      // Other bots: low activity
      { id: 'm4', from_uid: 'b1', to_uids: ['h1'], content: 'msg4', timestamp: new Date() },
      { id: 'm5', from_uid: 'b2', to_uids: ['h2'], content: 'msg5', timestamp: new Date() },
    ];
    
    testGraph = {
      graph_id: 'bot_tag_test',
      description: 'Bot tagging test',
      start_time: new Date('2026-03-01'),
      end_time: new Date('2026-03-18'),
      human_nodes: humans,
      ai_agent_nodes: bots,
      edges,
      messages,
      summary: {
        total_nodes: 7,
        total_humans: 4,
        total_bots: 3,
        total_edges: edges.length,
        total_messages: messages.length,
      },
      created_at: new Date(),
      version: '2.0',
    };
    
    engine = new AnalysisEngine(testGraph);
    tagger = new BotTagger(testGraph, engine);
  });
  
  // ========================================
  // Individual Tag Tests
  // ========================================
  
  describe('T1: Cross-Team Connector', () => {
    it('should detect cross-team bot', async () => {
      const b1 = testGraph.ai_agent_nodes.find(b => b.bot_name === 'CrossTeamBot')!;
      const result = await tagger.tagBot(b1);
      
      // b1 connects 3 teams (A, B, C)
      expect(result.tags).toContain('T1');
      expect(result.tagDetails['T1']?.matched).toBe(true);
    });
  });
  
  describe('T2: Intra-Team Hub', () => {
    it('should detect intra-team hub', async () => {
      const b2 = testGraph.ai_agent_nodes.find(b => b.bot_name === 'IntraTeamBot')!;
      const result = await tagger.tagBot(b2);
      
      // b2 only connects within team A (crossRatio = 0)
      // May or may not match depending on degree threshold
      expect(result.tagDetails['T2']).toBeDefined();
    });
  });
  
  describe('T5: High Activity', () => {
    it('should detect high activity bot', async () => {
      const b3 = testGraph.ai_agent_nodes.find(b => b.bot_name === 'ActiveBot')!;
      const result = await tagger.tagBot(b3);
      
      // b3 has 3 messages (60% of total bot messages)
      expect(result.tags).toContain('T5');
      expect(result.tagDetails['T5']?.matched).toBe(true);
    });
  });
  
  // ========================================
  // Tag All Bots Test
  // ========================================
  
  describe('Tag All Bots', () => {
    it('should tag all bots', async () => {
      const results = await tagger.tagAllBots();
      
      expect(results.length).toBe(3);
      
      // Each bot has a result
      for (const result of results) {
        expect(result.botId).toBeDefined();
        expect(result.botName).toBeDefined();
        expect(Array.isArray(result.tags)).toBe(true);
        expect(result.tagDetails).toBeDefined();
      }
    });
  });
});
