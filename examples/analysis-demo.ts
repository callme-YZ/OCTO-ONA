/**
 * Analysis Engine Demo
 * 
 * Shows how to use AnalysisEngine for graph analysis.
 */

import { DMWorkAdapter } from '../src/layer1/dmwork-adapter';
import { AnalysisEngine } from '../src/layer3/analysis-engine';

async function main() {
  const config = {
    host: 'example.com',
    port: 13306,
    user: 'dmwork_ro',
    password: 'dmwork_ro',
    database: 'im',
    platform: 'dmwork',
  };
  
  console.log('=== OCTO-ONA Analysis Demo ===\n');
  
  const adapter = new DMWorkAdapter(config);
  
  try {
    // Extract network
    console.log('Step 1: Extracting network...');
    const graph = await adapter.toNetworkGraph({
      startTime: new Date('2026-03-01'),
      endTime: new Date('2026-03-18'),
      uidWhitelist: [
        'user1_xxxxxxxxxxxxxxxxxxxxxxxx',
        'user2_xxxxxxxxxxxxxxxxxxxxxxxx',
        'user3_xxxxxxxxxxxxxxxxxxxxxxxx',
      ],
      graphId: 'analysis_demo',
    });
    console.log(`✅ Extracted ${graph.summary.total_messages} messages\n`);
    
    // Create analysis engine
    console.log('Step 2: Initializing analysis engine...');
    const engine = new AnalysisEngine(graph);
    
    // Graph stats
    const stats = engine.getGraphStats();
    console.log('Graph Statistics:');
    console.log(`  Nodes: ${stats.nodes}`);
    console.log(`  Edges: ${stats.edges}`);
    console.log(`  Density: ${stats.density.toFixed(4)}`);
    console.log(`  Avg Degree: ${stats.avgDegree.toFixed(2)}\n`);
    
    // Centrality
    console.log('Step 3: Computing centrality...');
    const centrality = await engine.computeCentrality();
    console.log('✅ Centrality computed\n');
    
    // Top nodes by degree
    console.log('Top 5 Nodes by Degree:');
    const topDegree = await engine.getTopNodes('degree', 5);
    for (const [nodeId, value] of topDegree) {
      const node = graph.human_nodes.find(n => n.id === nodeId) ||
                   graph.ai_agent_nodes.find(n => n.id === nodeId);
      const name = node && 'name' in node ? node.name : 
                   node && 'bot_name' in node ? node.bot_name : 'Unknown';
      console.log(`  ${name} (${nodeId.slice(0, 8)}...): ${value.toFixed(2)}`);
    }
    console.log();
    
    // Top nodes by betweenness
    console.log('Top 5 Nodes by Betweenness:');
    const topBetweenness = await engine.getTopNodes('betweenness', 5);
    for (const [nodeId, value] of topBetweenness) {
      const node = graph.human_nodes.find(n => n.id === nodeId) ||
                   graph.ai_agent_nodes.find(n => n.id === nodeId);
      const name = node && 'name' in node ? node.name : 
                   node && 'bot_name' in node ? node.bot_name : 'Unknown';
      console.log(`  ${name} (${nodeId.slice(0, 8)}...): ${value.toFixed(4)}`);
    }
    console.log();
    
    // Top nodes by closeness
    console.log('Top 5 Nodes by Closeness:');
    const topCloseness = await engine.getTopNodes('closeness', 5);
    for (const [nodeId, value] of topCloseness) {
      const node = graph.human_nodes.find(n => n.id === nodeId) ||
                   graph.ai_agent_nodes.find(n => n.id === nodeId);
      const name = node && 'name' in node ? node.name : 
                   node && 'bot_name' in node ? node.bot_name : 'Unknown';
      console.log(`  ${name} (${nodeId.slice(0, 8)}...): ${value.toFixed(4)}`);
    }
    
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await adapter.close();
  }
}

main().catch(console.error);
