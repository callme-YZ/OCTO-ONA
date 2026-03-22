/**
 * Dashboard Demo with External Data Loading
 * 
 * Generates a demo dashboard using external data.json loading.
 */

import { DashboardGenerator } from '../src/layer6/dashboard-generator';
import { NetworkGraph, HumanNode, AIAgentNode, Edge, Message } from '../src/layer2/models';

// Create demo network (same as dashboard-demo.ts)
const humans: HumanNode[] = [
  { id: 'h1', name: 'Charlie', type: 'human', team: 'Product' },
  { id: 'h2', name: 'Bob', type: 'human', team: 'Product' },
  { id: 'h3', name: 'Alice', type: 'human', team: 'Engineering' },
  { id: 'h4', name: 'David', type: 'human', team: 'Engineering' },
  { id: 'h5', name: 'Emma', type: 'human', team: 'Design' },
];

const bots: AIAgentNode[] = [
  { id: 'b1', bot_name: 'wuyun_bot', type: 'ai_agent', capabilities: [], functional_tags: ['T5'] },
  { id: 'b2', bot_name: 'chenpipi_bot', type: 'ai_agent', capabilities: [], functional_tags: ['T1', 'T2'] },
  { id: 'b3', bot_name: 'clever_bot', type: 'ai_agent', capabilities: [], functional_tags: ['T4'] },
];

const edges: Edge[] = [
  // Charlie (高Hub Score)
  { source: 'h2', target: 'h1', edge_type: 'H2H', weight: 15, is_cross_team: false, message_ids: Array(15).fill('m') },
  { source: 'h3', target: 'h1', edge_type: 'H2H', weight: 12, is_cross_team: true, message_ids: Array(12).fill('m') },
  { source: 'h4', target: 'h1', edge_type: 'H2H', weight: 8, is_cross_team: true, message_ids: Array(8).fill('m') },
  { source: 'h1', target: 'h2', edge_type: 'H2H', weight: 3, is_cross_team: false, message_ids: Array(3).fill('m') },
  
  // Bob
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

// Create messages
const baseDate = new Date('2026-03-01');
const messages: Message[] = [];

for (let day = 0; day < 17; day++) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + day);
  
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
  
  for (let i = 0; i < 100; i++) {
    messages.push({
      id: `mb1_${day}_${i}`,
      from_uid: 'b1',
      to_uids: [humans[Math.floor(Math.random() * humans.length)].id],
      content: '好的',
      timestamp: date,
    });
  }
  
  for (let i = 0; i < 30; i++) {
    messages.push({
      id: `mb2_${day}_${i}`,
      from_uid: 'b2',
      to_uids: [humans[Math.floor(Math.random() * humans.length)].id],
      content: '收到',
      timestamp: date,
    });
  }
  
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
  graph_id: 'demo_network_external',
  description: 'OCTO-ONA Demo Network (External Data)',
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

// Generate dashboard with external data
async function main() {
  console.log('Generating demo dashboard with external data...');
  console.log(`Network: ${demoGraph.summary.total_nodes} nodes, ${demoGraph.summary.total_messages} messages`);
  
  const generator = new DashboardGenerator(demoGraph);
  const outputDir = './demo-dashboard-external';
  
  await generator.generateWithExternalData(outputDir);
  
  console.log('\n✅ Demo dashboard generated successfully!');
  console.log(`📊 Open ${outputDir}/index.html in your browser to view.`);
  console.log('\n💡 Benefits of external data mode:');
  console.log('   - Separation of data and presentation');
  console.log('   - Can update data.json without regenerating HTML');
  console.log('   - Easier to version control and diff');
}

main().catch(console.error);
