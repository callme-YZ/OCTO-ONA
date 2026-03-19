/**
 * DMWork Filtered Example
 * 
 * Extract OCTO team subnetwork using UID whitelist.
 */

import { DMWorkAdapter } from '../src/layer1/dmwork-adapter';
import fs from 'fs/promises';

async function main() {
  const config = {
    host: 'im-test.xming.ai',
    port: 13306,
    user: 'dmwork_ro',
    password: 'dmwork_ro',
    database: 'im',
    platform: 'dmwork',
  };
  
  // OCTO team core members (example)
  const octoUids = [
    '71e2a58ecce04aba972ce73c72b89f64', // 黄楠
    'eca0702f83e048c7b6151b21b1a3b9de', // 辉哥
    'f6f40587f02e46be928ceaf4d8e9fe76', // 嘉伟
    // ... add more UIDs
  ];
  
  const adapter = new DMWorkAdapter(config);
  
  try {
    // Extract OCTO subnetwork
    const graph = await adapter.toNetworkGraph({
      startTime: new Date('2026-03-01'),
      endTime: new Date('2026-03-18'),
      uidWhitelist: octoUids,
      graphId: 'octo_2026_03',
    });
    
    console.log('=== OCTO Network ===');
    console.log(`Nodes: ${graph.summary.total_nodes}`);
    console.log(`Edges: ${graph.summary.total_edges}`);
    console.log(`Messages: ${graph.summary.total_messages}`);
    
    await fs.writeFile('octo-network.json', JSON.stringify(graph, null, 2));
    console.log('\nSaved to octo-network.json');
    
  } finally {
    await adapter.close();
  }
}

main().catch(console.error);
