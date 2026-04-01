/**
 * Simple integration test for bot ownership detection
 * Run with: npx ts-node scripts/test-bot-ownership-detection.ts
 */

import mysql from 'mysql2/promise';

interface BotOwnershipCandidate {
  userId: string;
  botId: string;
  sourceId: string;
  confidence: number;
  evidence: {
    dmCount?: number;
    mentionCount?: number;
    replyCount?: number;
  };
}

async function detectBotOwnership(
  db: mysql.Connection,
  botId: string,
  sourceId: string
): Promise<BotOwnershipCandidate | null> {
  console.log(`\n🔍 Detecting ownership for bot: ${botId}`);

  // Strategy 1: DM conversations
  const [dmRows] = await db.query<any[]>(
    `
    SELECT 
      from_uid as user_id,
      COUNT(*) as dm_count
    FROM messages m
    JOIN channels c ON m.channel_id = c.channel_id
    WHERE c.type = 'dm'
      AND c.source_id = ?
      AND m.reply_to_uid = ?
    GROUP BY from_uid
    ORDER BY dm_count DESC
    LIMIT 1
    `,
    [sourceId, botId]
  );

  // Strategy 2: Mentions
  const [mentionRows] = await db.query<any[]>(
    `
    SELECT 
      from_uid as user_id,
      COUNT(*) as mention_count
    FROM messages
    WHERE source_id = ?
      AND JSON_CONTAINS(mentioned_uids, ?)
    GROUP BY from_uid
    ORDER BY mention_count DESC
    LIMIT 1
    `,
    [sourceId, JSON.stringify(botId)]
  );

  // Strategy 3: Replies to bot
  const [replyRows] = await db.query<any[]>(
    `
    SELECT 
      from_uid as user_id,
      COUNT(*) as reply_count
    FROM messages
    WHERE source_id = ?
      AND reply_to_uid = ?
    GROUP BY from_uid
    ORDER BY reply_count DESC
    LIMIT 1
    `,
    [sourceId, botId]
  );

  // Combine evidence
  const votes: Record<string, any> = {};

  if (dmRows.length > 0) {
    const userId = dmRows[0].user_id;
    if (!votes[userId]) votes[userId] = { count: 0, evidence: {} };
    votes[userId].count++;
    votes[userId].evidence.dmCount = dmRows[0].dm_count;
    console.log(`  ✓ DM strategy: ${userId} (${dmRows[0].dm_count} DMs)`);
  }

  if (mentionRows.length > 0) {
    const userId = mentionRows[0].user_id;
    if (!votes[userId]) votes[userId] = { count: 0, evidence: {} };
    votes[userId].count++;
    votes[userId].evidence.mentionCount = mentionRows[0].mention_count;
    console.log(`  ✓ Mention strategy: ${userId} (${mentionRows[0].mention_count} mentions)`);
  }

  if (replyRows.length > 0) {
    const userId = replyRows[0].user_id;
    if (!votes[userId]) votes[userId] = { count: 0, evidence: {} };
    votes[userId].count++;
    votes[userId].evidence.replyCount = replyRows[0].reply_count;
    console.log(`  ✓ Reply strategy: ${userId} (${replyRows[0].reply_count} replies)`);
  }

  if (Object.keys(votes).length === 0) {
    console.log(`  ❌ No evidence found`);
    return null;
  }

  // Find winner
  const winner = Object.entries(votes).sort((a, b) => b[1].count - a[1].count)[0];
  const [userId, { count, evidence }] = winner;

  const confidence = count / 3;

  console.log(`  ✅ Winner: ${userId} (confidence: ${(confidence * 100).toFixed(0)}%)`);

  return {
    userId,
    botId,
    sourceId,
    confidence,
    evidence,
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Bot Ownership Detection Test                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'octo_ona',
  });

  try {
    // Get a sample of bots
    const [bots] = await db.query<any[]>(
      'SELECT uid FROM users WHERE is_bot = 1 AND source_id = ? LIMIT 5',
      ['dmwork-octo']
    );

    console.log(`Found ${bots.length} sample bots\n`);

    let detected = 0;
    let failed = 0;

    for (const bot of bots) {
      const result = await detectBotOwnership(db, bot.uid, 'dmwork-octo');
      if (result && result.confidence > 0.3) {
        detected++;

        // Insert into database
        await db.query(
          `
          INSERT INTO user_bot_ownership (user_id, bot_id, source_id)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
          `,
          [result.userId, result.botId, result.sourceId]
        );
        console.log(`  💾 Saved to database`);
      } else {
        failed++;
      }
    }

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log(`║  Summary: ${detected} detected, ${failed} failed`);
    console.log('╚══════════════════════════════════════════════════════════╝');

    // Show sample results
    const [rows] = await db.query<any[]>(
      'SELECT * FROM user_bot_ownership WHERE source_id = ? LIMIT 5',
      ['dmwork-octo']
    );

    console.log('\nSample ownership records:');
    for (const row of rows) {
      console.log(`  ${row.user_id} → ${row.bot_id}`);
    }
  } finally {
    await db.end();
  }
}

main().catch(console.error);
