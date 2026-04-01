/**
 * OCTO-ONA CLI - Bot Management Commands
 * 
 * Commands:
 *   bot assign <user_id> <bot_id>  - Assign bot to user
 *   bot list <user_id>              - List bots owned by user
 *   bot remove <user_id> <bot_id>   - Remove bot ownership
 *   bot show <bot_id>               - Show bot owner
 */

import mysql from 'mysql2/promise';

export interface BotCommandOptions {
  sourceId?: string;
  verbose?: boolean;
}

/**
 * Assign a bot to a user
 */
export async function assignBot(
  userId: string,
  botId: string,
  options: BotCommandOptions
): Promise<void> {
  const db = await getConnection();

  try {
    // Verify user exists
    const [userRows] = await db.query<any[]>(
      'SELECT uid, is_bot FROM users WHERE uid = ?',
      [userId]
    );

    if (userRows.length === 0) {
      throw new Error(`User not found: ${userId}`);
    }

    if (userRows[0].is_bot) {
      throw new Error(`Cannot assign bot to another bot: ${userId}`);
    }

    // Verify bot exists
    const [botRows] = await db.query<any[]>(
      'SELECT uid, is_bot FROM users WHERE uid = ?',
      [botId]
    );

    if (botRows.length === 0) {
      throw new Error(`Bot not found: ${botId}`);
    }

    if (!botRows[0].is_bot) {
      throw new Error(`User is not a bot: ${botId}`);
    }

    // Get source_id
    const sourceId = options.sourceId || userId.split(':')[0];

    // Insert ownership
    await db.query(
      `
      INSERT INTO user_bot_ownership (user_id, bot_id, source_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
      `,
      [userId, botId, sourceId]
    );

    console.log(`✅ Bot assigned successfully`);
    console.log(`   User: ${userId}`);
    console.log(`   Bot:  ${botId}`);

    if (options.verbose) {
      // Show existing ownership count
      const [countRows] = await db.query<any[]>(
        'SELECT COUNT(*) as count FROM user_bot_ownership WHERE user_id = ?',
        [userId]
      );
      console.log(`   Total bots owned by user: ${countRows[0].count}`);
    }
  } finally {
    await db.end();
  }
}

/**
 * List bots owned by a user
 */
export async function listBots(
  userId: string,
  options: BotCommandOptions
): Promise<void> {
  const db = await getConnection();

  try {
    const [rows] = await db.query<any[]>(
      `
      SELECT 
        o.bot_id,
        u.name as bot_name,
        o.created_at,
        o.updated_at
      FROM user_bot_ownership o
      JOIN users u ON o.bot_id = u.uid
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
      `,
      [userId]
    );

    if (rows.length === 0) {
      console.log(`No bots owned by user: ${userId}`);
      return;
    }

    console.log(`\n📋 Bots owned by ${userId}:\n`);

    for (const row of rows) {
      console.log(`  • ${row.bot_id}`);
      if (row.bot_name) {
        console.log(`    Name: ${row.bot_name}`);
      }
      if (options.verbose) {
        console.log(`    Assigned: ${row.created_at}`);
        console.log(`    Updated: ${row.updated_at}`);
      }
      console.log('');
    }

    console.log(`Total: ${rows.length} bot(s)\n`);
  } finally {
    await db.end();
  }
}

/**
 * Remove bot ownership
 */
export async function removeBot(
  userId: string,
  botId: string,
  options: BotCommandOptions
): Promise<void> {
  const db = await getConnection();

  try {
    const [result] = await db.query<any>(
      'DELETE FROM user_bot_ownership WHERE user_id = ? AND bot_id = ?',
      [userId, botId]
    );

    if (result.affectedRows === 0) {
      throw new Error(`Ownership not found: ${userId} → ${botId}`);
    }

    console.log(`✅ Bot ownership removed`);
    console.log(`   User: ${userId}`);
    console.log(`   Bot:  ${botId}`);
  } finally {
    await db.end();
  }
}

/**
 * Show bot owner
 */
export async function showBot(
  botId: string,
  options: BotCommandOptions
): Promise<void> {
  const db = await getConnection();

  try {
    // Get bot info
    const [botRows] = await db.query<any[]>(
      'SELECT uid, name, is_bot FROM users WHERE uid = ?',
      [botId]
    );

    if (botRows.length === 0) {
      throw new Error(`Bot not found: ${botId}`);
    }

    const bot = botRows[0];

    console.log(`\n🤖 Bot: ${botId}`);
    if (bot.name) {
      console.log(`   Name: ${bot.name}`);
    }
    console.log(`   Is Bot: ${bot.is_bot ? 'Yes' : 'No'}`);

    // Get ownership
    const [ownerRows] = await db.query<any[]>(
      `
      SELECT 
        o.user_id,
        u.name as user_name,
        o.created_at,
        o.updated_at
      FROM user_bot_ownership o
      JOIN users u ON o.user_id = u.uid
      WHERE o.bot_id = ?
      `,
      [botId]
    );

    if (ownerRows.length === 0) {
      console.log(`   Owner: (not assigned)\n`);
    } else {
      const owner = ownerRows[0];
      console.log(`   Owner: ${owner.user_id}`);
      if (owner.user_name) {
        console.log(`   Owner Name: ${owner.user_name}`);
      }
      if (options.verbose) {
        console.log(`   Assigned: ${owner.created_at}`);
        console.log(`   Updated: ${owner.updated_at}`);
      }
      console.log('');
    }
  } finally {
    await db.end();
  }
}

/**
 * Batch import bot ownership from CSV
 */
export async function importBots(
  csvPath: string,
  options: BotCommandOptions
): Promise<void> {
  const fs = require('fs');
  const db = await getConnection();

  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter((line: string) => line.trim());

    // Skip header if exists
    const hasHeader = lines[0].toLowerCase().includes('user') && lines[0].toLowerCase().includes('bot');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    let imported = 0;
    let failed = 0;

    console.log(`\n📥 Importing from ${csvPath}...\n`);

    for (const line of dataLines) {
      const [userId, botId, sourceId] = line.split(',').map((s: string) => s.trim());

      if (!userId || !botId) {
        console.log(`⚠️  Skipped invalid line: ${line}`);
        failed++;
        continue;
      }

      try {
        const finalSourceId = sourceId || options.sourceId || userId.split(':')[0];

        await db.query(
          `
          INSERT INTO user_bot_ownership (user_id, bot_id, source_id)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
          `,
          [userId, botId, finalSourceId]
        );

        console.log(`✅ ${userId} → ${botId}`);
        imported++;
      } catch (error) {
        console.log(`❌ ${userId} → ${botId}: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${dataLines.length}\n`);
  } finally {
    await db.end();
  }
}

/**
 * Get database connection
 */
async function getConnection(): Promise<mysql.Connection> {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'octo_ona',
  });
}
