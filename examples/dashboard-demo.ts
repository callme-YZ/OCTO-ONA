/**
 * Dashboard Demo Generator
 * 
 * Generates a demo dashboard with synthetic data.
 */

import { DashboardGenerator } from '../src/layer6/dashboard-generator';
import { NetworkGraph, HumanNode, AIAgentNode, Edge, Message, createEmptyGraph } from '../src/layer2/models';

// Create demo network
const humans: HumanNode[] = [
  { id: 'h1', name: 'Charlie', type: 'human', team: 'Product' },
  { id: 'h2', name: 'Bob', type: 'human', team: 'Product' },
  { id: 'h3', name: 'Alice', type: 'human', team: 'Engineering' },
  { id: 'h4', name: 'David', type: 'human', team: 'Engineering' },
  { id: 'h5', name: 'Alice', type: 'human', team: 'Design' },
];

const bots: AIAgentNode[] = [
  { id: 'b1', bot_name: 'wuyun_bot', type: 'ai_agent', capabilities: [], functional_tags: ['T5'] },
  { id: 'b2', bot_name: 'chenpipi_bot', type: 'ai_agent', capabilities: [], functional_tags: ['T1', 'T2'] },
  { id: 'b3', bot_name: 'clever_bot', type: 'ai_agent', capabilities: [], functional_tags: ['T4'] },
];

const edges: Edge[] = [
  // Charlie (高Hub Score - 被@多，发送少)
  { source: 'h2', target: 'h1', edge_type: 'H2H', weight: 15, is_cross_team: false, message_ids: Array(15).fill('m') },
  { source: 'h3', target: 'h1', edge_type: 'H2H', weight: 12, is_cross_team: true, message_ids: Array(12).fill('m') },
  { source: 'h4', target: 'h1', edge_type: 'H2H', weight: 8, is_cross_team: true, message_ids: Array(8).fill('m') },
  { source: 'h1', target: 'h2', edge_type: 'H2H', weight: 3, is_cross_team: false, message_ids: Array(3).fill('m') },
  
  // Bob (中Hub Score)
  { source: 'h3', target: 'h2', edge_type: 'H2H', weight: 10, is_cross_team: true, message_ids: Array(10).fill('m') },
  { source: 'h4', target: 'h2', edge_type: 'H2H', weight: 6, is_cross_team: true, message_ids: Array(6).fill('m') },
  { source: 'h2', target: 'h3', edge_type: 'H2H', weight: 8, is_cross_team: true, message_ids: Array(8).fill('m') },
  
  // Bot connections
  { source: 'b1', target: 'h1', edge_type: 'B2H', weight: 20, is_cross_team: false, message_ids: Array(20).fill('m') },
  { source: 'b1', target: 'h2', edge_type: 'B2H', weight: 15, is_cross_team: false, message_ids: Array(15).fill('m') },
  { source: 'b2', target: 'h3', edge_type: 'B2H', weight: 10, is_cross_team: true, message_ids: Array(10).fill('m') },
  { source: 'b2', target: 'h4', edge_type: 'B2H', weight: 10, is_cross_team: true, message_ids: Array(10).fill('m') },
  { source: 'b2', target: 'h5', edge_type: 'B2H', weight: 8, is_cross_team: true, message_ids: Array(8).fill('m') },
  { source: 'b3', target: 'h3', edge_type: 'B2H', weight: 5, is_cross_team: false, message_ids: Array(5).fill('m') },
];

// Create messages (timeline data)
const baseDate = new Date('2026-03-01');
const messages: Message[] = [];

for (let day = 0; day < 17; day++) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + day);
  
  // Random message count per day (50-150)
  const count = 50 + Math.floor(Math.random() * 100);
  
  for (let i = 0; i < count; i++) {
    const fromHuman = humans[Math.floor(Math.random() * humans.length)];
    const toHuman = humans[Math.floor(Math.random() * humans.length)];
    
    if (fromHuman.id !== toHuman.id) {
      messages.push({
        id: `m${day}_${i}`,
        from_uid: fromHuman.id,
        to_uids: [toHuman.id],
        content: Math.random() > 0.7 ? '感觉这个设计不对' : '收到',
        timestamp: date,
      });
    }
  }
}

// Add bot messages
for (let day = 0; day < 17; day++) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + day);
  
  // b1: High activity (100 msgs/day)
  for (let i = 0; i < 100; i++) {
    messages.push({
      id: `mb1_${day}_${i}`,
      from_uid: 'b1',
      to_uids: [humans[Math.floor(Math.random() * humans.length)].id],
      content: '好的',
      timestamp: date,
    });
  }
  
  // b2: Medium activity (30 msgs/day)
  for (let i = 0; i < 30; i++) {
    messages.push({
      id: `mb2_${day}_${i}`,
      from_uid: 'b2',
      to_uids: [humans[Math.floor(Math.random() * humans.length)].id],
      content: '收到',
      timestamp: date,
    });
  }
  
  // b3: Low activity (10 msgs/day)
  for (let i = 0; i < 10; i++) {
    messages.push({
      id: `mb3_${day}_${i}`,
      from_uid: 'b3',
      to_uids: [humans[Math.floor(Math.random() * humans.length)].id],
      content: '好的',
      timestamp: date,
    });
  }
}

const demoGraph: NetworkGraph = {
  graph_id: 'demo_network',
  description: 'OCTO-ONA Demo Network',
  start_time: new Date('2026-03-01'),
  end_time: new Date('2026-03-18'),
  human_nodes: humans,
  ai_agent_nodes: bots,
  edges,
  messages,
  summary: {
    total_nodes: humans.length + bots.length,
    total_humans: humans.length,
    total_bots: bots.length,
    total_edges: edges.length,
    total_messages: messages.length,
  },
  created_at: new Date(),
  version: '2.0',
};

// Generate dashboard
async function main() {
  console.log('Generating demo dashboard...');
  console.log(`Network: ${demoGraph.summary.total_nodes} nodes, ${demoGraph.summary.total_messages} messages`);
  
  const generator = new DashboardGenerator(demoGraph);
  const outputPath = './demo-dashboard.html';
  
  await generator.generate(outputPath);
  
  console.log('\n✅ Demo dashboard generated successfully!');
  console.log(`📊 Open ${outputPath} in your browser to view.`);
}

main().catch(console.error);
