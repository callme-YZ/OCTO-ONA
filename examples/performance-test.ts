/**
 * Performance Test
 * 
 * Tests DMWorkAdapter performance with large datasets.
 */

import { DMWorkAdapter } from '../src/layer1/dmwork-adapter';

async function main() {
  const config = {
    host: 'example.com',
    port: 13306,
    user: 'dmwork_ro',
    password: 'dmwork_ro',
    database: 'im',
    platform: 'dmwork',
  };
  
  console.log('=== OCTO-ONA Performance Test ===\n');
  
  const adapter = new DMWorkAdapter(config);
  
  try {
    // Test 1: Full dataset extraction
    console.log('Test 1: Full dataset (2026-03-01 to 2026-03-18)');
    console.log('Expected: ~600k messages from 5 tables');
    console.log('Target: Complete in <60s\n');
    
    const startTime = Date.now();
    
    const graph = await adapter.toNetworkGraph({
      startTime: new Date('2026-03-01'),
      endTime: new Date('2026-03-18'),
      graphId: 'performance_test_full',
    });
    
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('--- Results ---');
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log(`Messages: ${graph.messages?.length || 0}`);
    console.log(`Nodes: ${graph.human_nodes.length + graph.ai_agent_nodes.length}`);
    console.log(`Edges: ${graph.edges.length}`);
    console.log(`Throughput: ${((graph.messages?.length || 0) / duration).toFixed(0)} msgs/s\n`);
    
    if (duration > 60) {
      console.warn('⚠️ WARNING: Extraction took >' + ' 60s. Consider optimization.');
    } else {
      console.log('✅ PASS: Performance acceptable');
    }
    
    // Test 2: Filtered dataset (OCTO team)
    console.log('\nTest 2: Filtered dataset (UID whitelist)');
    console.log('Expected: ~30k messages');
    console.log('Target: Complete in <30s\n');
    
    const startTime2 = Date.now();
    
    const graphFiltered = await adapter.toNetworkGraph({
      startTime: new Date('2026-03-01'),
      endTime: new Date('2026-03-18'),
      uidWhitelist: [
        'user1_xxxxxxxxxxxxxxxxxxxxxxxx',
        'user2_xxxxxxxxxxxxxxxxxxxxxxxx',
        'user3_xxxxxxxxxxxxxxxxxxxxxxxx',
        'user4_xxxxxxxxxxxxxxxxxxxxxxxx',
        'user5_xxxxxxxxxxxxxxxxxxxxxxxx',
        'user6_xxxxxxxxxxxxxxxxxxxxxxxx',
        'user7_xxxxxxxxxxxxxxxxxxxxxxxx',
      ],
      graphId: 'performance_test_filtered',
    });
    
    const duration2 = (Date.now() - startTime2) / 1000;
    
    console.log('--- Results ---');
    console.log(`Duration: ${duration2.toFixed(2)}s`);
    console.log(`Messages: ${graphFiltered.messages?.length || 0}`);
    console.log(`Reduction: ${(100 - (graphFiltered.messages?.length || 0) / (graph.messages?.length || 1) * 100).toFixed(1)}%`);
    console.log(`Throughput: ${((graphFiltered.messages?.length || 0) / duration2).toFixed(0)} msgs/s\n`);
    
    if (duration2 > 30) {
      console.warn('⚠️ WARNING: Filtered extraction took >30s. Consider optimization.');
    } else {
      console.log('✅ PASS: Performance acceptable');
    }
    
    // Summary
    console.log('\n=== Performance Summary ===');
    console.log(`Full dataset: ${duration.toFixed(2)}s (${((graph.messages?.length || 0) / duration).toFixed(0)} msgs/s)`);
    console.log(`Filtered: ${duration2.toFixed(2)}s (${((graphFiltered.messages?.length || 0) / duration2).toFixed(0)} msgs/s)`);
    
    const totalTime = duration + duration2;
    if (totalTime > 90) {
      console.log('\n⚠️ Overall performance needs optimization');
      process.exit(1);
    } else {
      console.log('\n✅ All performance tests passed');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await adapter.close();
  }
}

main().catch(console.error);
