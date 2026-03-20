/**
 * Data Validation Demo
 * 
 * Shows how to use DataValidator with DMWork adapter.
 */

import { DMWorkAdapter } from '../src/layer1/dmwork-adapter';
import { DataValidator } from '../src/layer1/validator';

async function main() {
  const config = {
    host: 'im-test.xming.ai',
    port: 13306,
    user: 'dmwork_ro',
    password: 'dmwork_ro',
    database: 'im',
    platform: 'dmwork',
  };
  
  const adapter = new DMWorkAdapter(config);
  
  try {
    // Extract graph
    console.log('Extracting network...\n');
    const graph = await adapter.toNetworkGraph({
      startTime: new Date('2026-03-01'),
      endTime: new Date('2026-03-18'),
      graphId: 'validation_test',
    });
    
    // Validate
    console.log('Running validation...\n');
    const validator = new DataValidator();
    const report = validator.validate(graph, {
      expectedNodes: 15,
      expectedMessages: 30000,
      minMessagesPerNode: 10,
    });
    
    // Print report
    console.log(DataValidator.formatReport(report));
    
    // Exit code
    process.exit(report.passed ? 0 : 1);
    
  } finally {
    await adapter.close();
  }
}

main().catch(console.error);
