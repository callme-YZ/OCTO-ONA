/**
 * Test bot import command
 */

import { importBots, listBots } from '../src/cli/bot';

async function test() {
  console.log('Testing CSV import...\n');

  try {
    await importBots('/tmp/test-bot-ownership.csv', { verbose: true });

    console.log('\nVerifying import...\n');
    await listBots('0091af9cec1d4d2ca42a977aad4365ca', { verbose: false });

    console.log('✅ Import test passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
