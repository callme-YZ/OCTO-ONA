/**
 * E2E Workflow Test
 * 
 * Tests the complete workflow:
 * 1. Sync data from remote to local (or use local test data)
 * 2. Build network graph
 * 3. Calculate metrics
 * 4. Export results
 */

import { OCTOAdapter } from '../../src/layer1/adapters/octo-adapter';
import { LocalDatabase } from '../../src/database/local-database';
import { MetricsCalculator } from '../../src/layer4/metrics-calculator-v2';
import * as fs from 'fs';
import * as path from 'path';

const LOCAL_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'octo_ona',
};

const SOURCE_ID = 'test_e2e_workflow';
const OUTPUT_DIR = path.join(process.cwd(), 'test-output');

describe('E2E Workflow', () => {
  let db: LocalDatabase;

  beforeAll(async () => {
    db = new LocalDatabase(LOCAL_CONFIG);

    // Clean up previous test data
    await (db as any).pool.query('DELETE FROM sync_metadata WHERE source_id = ?', [SOURCE_ID]);
    await (db as any).pool.query('DELETE FROM messages WHERE source_id = ?', [SOURCE_ID]);
    await (db as any).pool.query('DELETE FROM users WHERE source_id = ?', [SOURCE_ID]);
    await (db as any).pool.query('DELETE FROM channels WHERE source_id = ?', [SOURCE_ID]);
    await (db as any).pool.query('DELETE FROM data_sources WHERE id = ?', [SOURCE_ID]);

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  });

  afterAll(async () => {
    // Clean up test data
    await (db as any).pool.query('DELETE FROM sync_metadata WHERE source_id = ?', [SOURCE_ID]);
    await (db as any).pool.query('DELETE FROM messages WHERE source_id = ?', [SOURCE_ID]);
    await (db as any).pool.query('DELETE FROM users WHERE source_id = ?', [SOURCE_ID]);
    await (db as any).pool.query('DELETE FROM channels WHERE source_id = ?', [SOURCE_ID]);
    await (db as any).pool.query('DELETE FROM data_sources WHERE id = ?', [SOURCE_ID]);

    await db.close();

    // Clean up output files
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true });
    }
  });

  it('Complete workflow: insert data → build graph → calculate metrics → export', async () => {
    console.log('\n🚀 Starting E2E workflow test...\n');

    // ============================================
    // Step 1: Insert test data
    // ============================================
    console.log('📥 Step 1: Inserting test data...');

    await db.insertDataSource({
      id: SOURCE_ID,
      type: 'dmwork',
      name: 'E2E Test Source',
      config: {},
    });

    const users = [
      { uid: `${SOURCE_ID}:user1`, source_id: SOURCE_ID, source_user_id: 'user1', name: 'Alice', is_bot: false },
      { uid: `${SOURCE_ID}:user2`, source_id: SOURCE_ID, source_user_id: 'user2', name: 'Bob', is_bot: false },
      { uid: `${SOURCE_ID}:bot1`, source_id: SOURCE_ID, source_user_id: 'bot1', name: 'Helper Bot', is_bot: true, metadata: { creator_uid: 'admin' } },
    ];
    await db.insertUsers(users);

    const channels = [
      { channel_id: `${SOURCE_ID}:ch1`, source_id: SOURCE_ID, source_channel_id: 'ch1', name: 'General', type: 'group' as const },
    ];
    await db.insertChannels(channels);

    const now = Math.floor(Date.now() / 1000);
    const messages = [
      {
        message_id: `${SOURCE_ID}:msg1`,
        source_id: SOURCE_ID,
        source_message_id: 'msg1',
        channel_id: `${SOURCE_ID}:ch1`,
        from_uid: `${SOURCE_ID}:user1`,
        content: '@bot1 help',
        timestamp: now - 3600,
        mentioned_uids: [`${SOURCE_ID}:bot1`], // Explicit @mention
      },
      {
        message_id: `${SOURCE_ID}:msg2`,
        source_id: SOURCE_ID,
        source_message_id: 'msg2',
        channel_id: `${SOURCE_ID}:ch1`,
        from_uid: `${SOURCE_ID}:bot1`,
        content: 'Sure! How can I help?',
        timestamp: now - 3500,
        reply_to_message_id: `${SOURCE_ID}:msg1`,
        reply_to_uid: `${SOURCE_ID}:user1`,
        mentioned_uids: [`${SOURCE_ID}:user1`], // Bot replies to user1
      },
      {
        message_id: `${SOURCE_ID}:msg3`,
        source_id: SOURCE_ID,
        source_message_id: 'msg3',
        channel_id: `${SOURCE_ID}:ch1`,
        from_uid: `${SOURCE_ID}:user1`,
        content: 'What is ONA?',
        timestamp: now - 3400,
        mentioned_uids: [`${SOURCE_ID}:bot1`],
      },
      {
        message_id: `${SOURCE_ID}:msg4`,
        source_id: SOURCE_ID,
        source_message_id: 'msg4',
        channel_id: `${SOURCE_ID}:ch1`,
        from_uid: `${SOURCE_ID}:bot1`,
        content: 'ONA stands for Organizational Network Analysis.',
        timestamp: now - 3300,
        mentioned_uids: [`${SOURCE_ID}:user1`], // Bot replies to user1
      },
      {
        message_id: `${SOURCE_ID}:msg5`,
        source_id: SOURCE_ID,
        source_message_id: 'msg5',
        channel_id: `${SOURCE_ID}:ch1`,
        from_uid: `${SOURCE_ID}:user2`,
        content: 'Thanks Alice!',
        timestamp: now - 3200,
        mentioned_uids: [`${SOURCE_ID}:user1`],
      },
    ];
    await db.insertMessages(messages);

    console.log('  ✅ Inserted 3 users, 1 channel, 5 messages\n');

    // ============================================
    // Step 2: Build network graph
    // ============================================
    console.log('🔨 Step 2: Building network graph...');

    const adapter = new OCTOAdapter({
      mode: 'local',
      localConfig: LOCAL_CONFIG,
      sourceId: SOURCE_ID,
    });

    await adapter.connect();
    const graph = await adapter.extractNetwork();
    await adapter.disconnect();

    expect(graph).toBeDefined();
    expect(graph.human_nodes.length).toBe(2); // Alice, Bob
    expect(graph.ai_agent_nodes.length).toBe(1); // Helper Bot
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.messages?.length).toBe(5);

    console.log(`  ✅ Graph built: ${graph.human_nodes.length} humans, ${graph.ai_agent_nodes.length} bots, ${graph.edges.length} edges\n`);

    // ============================================
    // Step 3: Calculate metrics
    // ============================================
    console.log('📊 Step 3: Calculating metrics...');

    const calculator = new MetricsCalculator(graph, db);

    // Calculate all P0 metrics
    const p0Results = await calculator.calculateByPriority('P0');

    expect(p0Results.length).toBeGreaterThanOrEqual(10);

    console.log(`  ✅ Calculated ${p0Results.length} P0 metrics:`);
    for (const result of p0Results.slice(0, 5)) {
      console.log(`     - ${result.metricId}: ${result.name}`);
    }
    console.log(`     ... (${p0Results.length - 5} more)\n`);

    // Verify specific metrics
    const densityResult = p0Results.find(r => r.metricId === 'L1.4');
    expect(densityResult).toBeDefined();
    expect(typeof densityResult!.value).toBe('number');

    const h2bRatioResult = p0Results.find(r => r.metricId === 'L2.2');
    expect(h2bRatioResult).toBeDefined();
    expect(typeof h2bRatioResult!.value).toBe('number');

    console.log('  ✅ Key metrics verified (L1.4, L2.2)\n');

    // ============================================
    // Step 4: Export results
    // ============================================
    console.log('💾 Step 4: Exporting results...');

    // Export graph JSON
    const graphPath = path.join(OUTPUT_DIR, 'graph.json');
    fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2));
    expect(fs.existsSync(graphPath)).toBe(true);

    // Export metrics JSON
    const metricsPath = path.join(OUTPUT_DIR, 'metrics.json');
    fs.writeFileSync(metricsPath, JSON.stringify(p0Results, null, 2));
    expect(fs.existsSync(metricsPath)).toBe(true);

    // Export summary CSV
    const csvPath = path.join(OUTPUT_DIR, 'summary.csv');
    const csvLines = [
      'metric_id,name,category,value',
      ...p0Results.map(r => `${r.metricId},${r.name},${r.category},${JSON.stringify(r.value)}`),
    ];
    fs.writeFileSync(csvPath, csvLines.join('\n'));
    expect(fs.existsSync(csvPath)).toBe(true);

    console.log(`  ✅ Exported:`);
    console.log(`     - ${graphPath}`);
    console.log(`     - ${metricsPath}`);
    console.log(`     - ${csvPath}\n`);

    console.log('✅ E2E workflow completed successfully!\n');
  }, 30000); // 30s timeout

  it('Should validate all 10 P0 metrics are calculable', async () => {
    console.log('\n🧪 Validating all P0 metrics...\n');

    // Insert minimal test data
    await db.insertDataSource({ id: SOURCE_ID + '_p0', type: 'dmwork', name: 'P0 Test', config: {} });
    await db.insertUsers([
      { uid: `${SOURCE_ID}_p0:u1`, source_id: SOURCE_ID + '_p0', source_user_id: 'u1', name: 'U1', is_bot: false },
      { uid: `${SOURCE_ID}_p0:b1`, source_id: SOURCE_ID + '_p0', source_user_id: 'b1', name: 'B1', is_bot: true },
    ]);
    await db.insertChannels([
      { channel_id: `${SOURCE_ID}_p0:c1`, source_id: SOURCE_ID + '_p0', source_channel_id: 'c1', name: 'C1', type: 'group' as const },
    ]);
    await db.insertMessages([
      {
        message_id: `${SOURCE_ID}_p0:m1`,
        source_id: SOURCE_ID + '_p0',
        source_message_id: 'm1',
        channel_id: `${SOURCE_ID}_p0:c1`,
        from_uid: `${SOURCE_ID}_p0:u1`,
        content: '@b1 test',
        timestamp: Math.floor(Date.now() / 1000),
        mentioned_uids: [`${SOURCE_ID}_p0:b1`],
      },
      {
        message_id: `${SOURCE_ID}_p0:m2`,
        source_id: SOURCE_ID + '_p0',
        source_message_id: 'm2',
        channel_id: `${SOURCE_ID}_p0:c1`,
        from_uid: `${SOURCE_ID}_p0:b1`,
        content: 'response',
        timestamp: Math.floor(Date.now() / 1000) + 10,
        mentioned_uids: [`${SOURCE_ID}_p0:u1`],
      },
    ]);

    const adapter = new OCTOAdapter({ mode: 'local', localConfig: LOCAL_CONFIG, sourceId: SOURCE_ID + '_p0' });
    await adapter.connect();
    const graph = await adapter.extractNetwork();
    await adapter.disconnect();

    const calculator = new MetricsCalculator(graph, db);

    const expectedMetrics = [
      'L1.1', // Degree Centrality
      'L1.2', // Betweenness Centrality
      'L1.4', // Network Density
      'L2.1', // Bot Functional Tags
      'L2.2', // H2B Collaboration Ratio
      'L3.1', // Connoisseurship Frequency
      'L3.2', // Connoisseurship Reach
      'L3.3', // Connoisseurship Conversion
      'L3.5', // Hub Score
      'T5',   // High Activity Bot
    ];

    const results: any[] = [];
    for (const metricId of expectedMetrics) {
      try {
        const result = await calculator.calculateMetric(metricId);
        results.push(result);
        console.log(`  ✅ ${metricId}: ${result.name}`);
      } catch (error) {
        console.error(`  ❌ ${metricId}: FAILED -`, (error as Error).message);
        throw error;
      }
    }

    expect(results.length).toBe(10);

    // Clean up
    await (db as any).pool.query('DELETE FROM messages WHERE source_id = ?', [SOURCE_ID + '_p0']);
    await (db as any).pool.query('DELETE FROM users WHERE source_id = ?', [SOURCE_ID + '_p0']);
    await (db as any).pool.query('DELETE FROM channels WHERE source_id = ?', [SOURCE_ID + '_p0']);
    await (db as any).pool.query('DELETE FROM data_sources WHERE id = ?', [SOURCE_ID + '_p0']);

    console.log('\n✅ All 10 P0 metrics validated!\n');
  }, 30000);
});
