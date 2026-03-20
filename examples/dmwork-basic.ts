/**
 * DMWork Basic Usage Example
 * 
 * Demonstrates how to extract a network graph from DMWork database.
 */

import { DMWorkAdapter } from '../src/layer1/dmwork-adapter';
import fs from 'fs/promises';

async function main() {
  // Configuration
  const config = {
    host: 'example.com',
    port: 13306,
    user: 'dmwork_ro',
    password: 'dmwork_ro',
    database: 'im',
    platform: 'dmwork',
  };
  
  console.log('Creating DMWork adapter...');
  const adapter = new DMWorkAdapter(config);
  
  try {
    // Extract network graph
    console.log('\nExtracting network graph...');
    const graph = await adapter.toNetworkGraph({
      startTime: new Date('2026-03-01'),
      endTime: new Date('2026-03-18'),
      graphId: 'dmwork_test',
    });
    
    // Display summary
    console.log('\n=== Network Summary ===');
    console.log(`Graph ID: ${graph.graph_id}`);
    console.log(`Time Range: ${graph.start_time} to ${graph.end_time}`);
    console.log(`Total Nodes: ${graph.summary.total_nodes}`);
    console.log(`  - Humans: ${graph.summary.total_humans}`);
    console.log(`  - Bots: ${graph.summary.total_bots}`);
    console.log(`Total Edges: ${graph.summary.total_edges}`);
    console.log(`Total Messages: ${graph.summary.total_messages}`);
    
    // Save to file
    const outputPath = 'dmwork-network.json';
    await fs.writeFile(outputPath, JSON.stringify(graph, null, 2));
    console.log(`\nSaved to ${outputPath}`);
    
  } finally {
    // Always close the connection
    await adapter.close();
    console.log('\nConnection closed');
  }
}

main().catch(console.error);
