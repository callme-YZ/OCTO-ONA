/**
 * Layer 6 DashboardGenerator - Unit Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { DashboardGenerator } from '../src/layer6/dashboard-generator';
import { NetworkGraph, HumanNode, AIAgentNode, Edge, Message } from '../src/layer2/models';

describe('Layer 6: DashboardGenerator', () => {
  
  let testGraph: NetworkGraph;
  let generator: DashboardGenerator;
  const testOutputPath = './test-dashboard.html';
  
  beforeEach(() => {
    const humans: HumanNode[] = [
      { id: 'h1', name: 'Alice', type: 'human' },
      { id: 'h2', name: 'Bob', type: 'human' },
    ];
    
    const bots: AIAgentNode[] = [
      { id: 'b1', bot_name: 'Bot1', type: 'ai_agent', capabilities: [], functional_tags: ['T5'] },
    ];
    
    const edges: Edge[] = [
      { source: 'h1', target: 'h2', edge_type: 'H2H', weight: 5, is_cross_team: false, message_ids: ['m1', 'm2'] },
      { source: 'b1', target: 'h1', edge_type: 'B2H', weight: 10, is_cross_team: false, message_ids: ['m3'] },
    ];
    
    const messages: Message[] = [
      { id: 'm1', from_uid: 'h1', to_uids: ['h2'], content: '感觉不对', timestamp: new Date('2026-03-18') },
      { id: 'm2', from_uid: 'h2', to_uids: ['h1'], content: '收到', timestamp: new Date('2026-03-18') },
      { id: 'm3', from_uid: 'b1', to_uids: ['h1'], content: '好的', timestamp: new Date('2026-03-18') },
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
    
    generator = new DashboardGenerator(testGraph);
  });
  
  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(testOutputPath)) {
      fs.unlinkSync(testOutputPath);
    }
  });
  
  // ========================================
  // Dashboard Generation Tests
  // ========================================
  
  describe('Dashboard Generation', () => {
    it('should generate HTML dashboard', async () => {
      await generator.generate(testOutputPath);
      
      expect(fs.existsSync(testOutputPath)).toBe(true);
    });
    
    it('should include correct metadata', async () => {
      await generator.generate(testOutputPath);
      
      const html = fs.readFileSync(testOutputPath, 'utf-8');
      
      expect(html).toContain('OCTO-ONA Dashboard');
      expect(html).toContain('test'); // graphId
      expect(html).toContain('2026-03-01'); // startTime
      expect(html).toContain('2026-03-18'); // endTime
    });
    
    it('should include KPI cards', async () => {
      await generator.generate(testOutputPath);
      
      const html = fs.readFileSync(testOutputPath, 'utf-8');
      
      expect(html).toContain('Total Nodes');
      expect(html).toContain('Human Nodes');
      expect(html).toContain('AI Agent Nodes');
      expect(html).toContain('Total Messages');
      expect(html).toContain('Network Density');
    });
    
    it('should include chart containers', async () => {
      await generator.generate(testOutputPath);
      
      const html = fs.readFileSync(testOutputPath, 'utf-8');
      
      expect(html).toContain('id="hubScoreChart"');
      expect(html).toContain('id="botTagsChart"');
      expect(html).toContain('id="networkGraph"');
      expect(html).toContain('id="timelineChart"');
      expect(html).toContain('Top 10 Interactions');
    });
    
    it('should inject chart data', async () => {
      await generator.generate(testOutputPath);
      
      const html = fs.readFileSync(testOutputPath, 'utf-8');
      
      expect(html).toContain('const hubScoreData');
      expect(html).toContain('const botTagsData');
      expect(html).toContain('const networkData');
      expect(html).toContain('const timelineData');
    });
    
    it('should be under 100KB', async () => {
      await generator.generate(testOutputPath);
      
      const stats = fs.statSync(testOutputPath);
      const sizeKB = stats.size / 1024;
      
      expect(sizeKB).toBeLessThan(100);
    });
  });
});
