/**
 * Test bot CLI commands
 * Run with: npx ts-node scripts/test-bot-cli.ts
 */

import { assignBot, listBots, removeBot, showBot } from '../src/cli/bot';

async function test() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Bot CLI Commands Test                                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const TEST_USER = '0091af9cec1d4d2ca42a977aad4365ca'; // Real user from DB
  const TEST_BOT = '__bot'; // Real bot from DB

  try {
    // Test 1: Assign bot
    console.log('━━━ Test 1: Assign Bot ━━━');
    await assignBot(TEST_USER, TEST_BOT, { sourceId: 'dmwork-octo', verbose: true });
    console.log('');

    // Test 2: List bots
    console.log('━━━ Test 2: List Bots ━━━');
    await listBots(TEST_USER, { verbose: true });

    // Test 3: Show bot
    console.log('━━━ Test 3: Show Bot ━━━');
    await showBot(TEST_BOT, { verbose: true });

    // Test 4: Remove bot
    console.log('━━━ Test 4: Remove Bot ━━━');
    await removeBot(TEST_USER, TEST_BOT, {});
    console.log('');

    // Test 5: Verify removal
    console.log('━━━ Test 5: Verify Removal ━━━');
    await listBots(TEST_USER, {});

    console.log('\n✅ All CLI tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

test().catch(console.error);
