/**
 * Tests for BotOwnershipDetector
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mysql from 'mysql2/promise';
import { BotOwnershipDetector } from '../../src/layer7/bot-ownership/detector';

describe('BotOwnershipDetector', () => {
  let db: mysql.Connection;
  let detector: BotOwnershipDetector;

  const TEST_SOURCE = 'test_source';
  const TEST_USER = `${TEST_SOURCE}:user001`;
  const TEST_BOT = `${TEST_SOURCE}:bot001`;
  const TEST_CHANNEL_DM = `${TEST_SOURCE}:dm_channel`;
  const TEST_CHANNEL_GROUP = `${TEST_SOURCE}:group_channel`;

  beforeAll(async () => {
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'octo_ona',
    });

    detector = new BotOwnershipDetector(db);

    // Clean up test data
    await db.query('DELETE FROM messages WHERE source_id = ?', [TEST_SOURCE]);
    await db.query('DELETE FROM users WHERE source_id = ?', [TEST_SOURCE]);
    await db.query('DELETE FROM channels WHERE source_id = ?', [TEST_SOURCE]);
    await db.query('DELETE FROM data_sources WHERE id = ?', [TEST_SOURCE]);
    await db.query('DELETE FROM user_bot_ownership WHERE source_id = ?', [TEST_SOURCE]);

    // Insert test data
    await db.query(
      'INSERT INTO data_sources (id, type, name) VALUES (?, ?, ?)',
      [TEST_SOURCE, 'dmwork', 'Test Source']
    );

    await db.query(
      'INSERT INTO users (uid, source_id, source_user_id, name, is_bot) VALUES (?, ?, ?, ?, ?)',
      [TEST_USER, TEST_SOURCE, 'user001', 'Test User', false]
    );

    await db.query(
      'INSERT INTO users (uid, source_id, source_user_id, name, is_bot) VALUES (?, ?, ?, ?, ?)',
      [TEST_BOT, TEST_SOURCE, 'bot001', 'Test Bot', true]
    );

    await db.query(
      'INSERT INTO channels (channel_id, source_id, source_channel_id, type) VALUES (?, ?, ?, ?)',
      [TEST_CHANNEL_DM, TEST_SOURCE, 'dm_channel', 'dm']
    );

    await db.query(
      'INSERT INTO channels (channel_id, source_id, source_channel_id, type) VALUES (?, ?, ?, ?)',
      [TEST_CHANNEL_GROUP, TEST_SOURCE, 'group_channel', 'group']
    );
  });

  afterAll(async () => {
    // Clean up
    await db.query('DELETE FROM messages WHERE source_id = ?', [TEST_SOURCE]);
    await db.query('DELETE FROM users WHERE source_id = ?', [TEST_SOURCE]);
    await db.query('DELETE FROM channels WHERE source_id = ?', [TEST_SOURCE]);
    await db.query('DELETE FROM data_sources WHERE id = ?', [TEST_SOURCE]);
    await db.query('DELETE FROM user_bot_ownership WHERE source_id = ?', [TEST_SOURCE]);
    await db.end();
  });

  describe('detectFromDMs', () => {
    it('should detect ownership from DM conversations', async () => {
      // Insert DM messages
      for (let i = 0; i < 20; i++) {
        await db.query(
          `INSERT INTO messages (
            message_id, source_id, source_message_id, channel_id, from_uid, 
            content, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            `${TEST_SOURCE}:dm${i}`,
            TEST_SOURCE,
            `dm${i}`,
            TEST_CHANNEL_DM,
            i % 2 === 0 ? TEST_USER : TEST_BOT,
            `DM message ${i}`,
            Date.now() + i,
          ]
        );
      }

      const result = await detector.detectForBot(TEST_BOT, TEST_SOURCE, 5);

      expect(result).toBeTruthy();
      expect(result?.userId).toBe(TEST_USER);
      expect(result?.botId).toBe(TEST_BOT);
      expect(result?.evidence.dmCount).toBeGreaterThan(0);
    });
  });

  describe('detectFromMentions', () => {
    it('should detect ownership from mentions', async () => {
      // Insert messages with mentions
      for (let i = 0; i < 15; i++) {
        await db.query(
          `INSERT INTO messages (
            message_id, source_id, source_message_id, channel_id, from_uid, 
            content, mentioned_uids, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `${TEST_SOURCE}:mention${i}`,
            TEST_SOURCE,
            `mention${i}`,
            TEST_CHANNEL_GROUP,
            TEST_USER,
            `Mention message ${i}`,
            JSON.stringify([TEST_BOT]),
            Date.now() + i,
          ]
        );
      }

      const result = await detector.detectForBot(TEST_BOT, TEST_SOURCE, 5);

      expect(result).toBeTruthy();
      expect(result?.userId).toBe(TEST_USER);
      expect(result?.evidence.mentionCount).toBeGreaterThan(0);
    });
  });

  describe('detectFromReplies', () => {
    it('should detect ownership from replies', async () => {
      // Insert bot messages
      for (let i = 0; i < 10; i++) {
        await db.query(
          `INSERT INTO messages (
            message_id, source_id, source_message_id, channel_id, from_uid, 
            content, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            `${TEST_SOURCE}:botmsg${i}`,
            TEST_SOURCE,
            `botmsg${i}`,
            TEST_CHANNEL_GROUP,
            TEST_BOT,
            `Bot message ${i}`,
            Date.now() + i,
          ]
        );

        // User replies to bot
        await db.query(
          `INSERT INTO messages (
            message_id, source_id, source_message_id, channel_id, from_uid, 
            content, reply_to_uid, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `${TEST_SOURCE}:reply${i}`,
            TEST_SOURCE,
            `reply${i}`,
            TEST_CHANNEL_GROUP,
            TEST_USER,
            `Reply ${i}`,
            TEST_BOT,
            Date.now() + i + 1000,
          ]
        );
      }

      const result = await detector.detectForBot(TEST_BOT, TEST_SOURCE, 5);

      expect(result).toBeTruthy();
      expect(result?.userId).toBe(TEST_USER);
      expect(result?.evidence.replyCount).toBeGreaterThan(0);
    });
  });

  describe('combineEvidence', () => {
    it('should have high confidence when multiple strategies agree', async () => {
      const result = await detector.detectForBot(TEST_BOT, TEST_SOURCE, 5);

      expect(result).toBeTruthy();
      expect(result?.confidence).toBeGreaterThan(0.5);
      expect(result?.userId).toBe(TEST_USER);
    });
  });

  describe('insertOwnership', () => {
    it('should insert ownership record', async () => {
      const candidate = await detector.detectForBot(TEST_BOT, TEST_SOURCE, 5);
      expect(candidate).toBeTruthy();

      await detector.insertOwnership(candidate!);

      const [rows] = await db.query<any[]>(
        'SELECT * FROM user_bot_ownership WHERE user_id = ? AND bot_id = ?',
        [TEST_USER, TEST_BOT]
      );

      expect(rows.length).toBe(1);
      expect(rows[0].user_id).toBe(TEST_USER);
      expect(rows[0].bot_id).toBe(TEST_BOT);
      expect(rows[0].source_id).toBe(TEST_SOURCE);
    });
  });

  describe('detectAll', () => {
    it('should detect ownership for all bots', async () => {
      const results = await detector.detectAll({
        sourceId: TEST_SOURCE,
        minConfidence: 0.3,
        minInteractions: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].userId).toBe(TEST_USER);
      expect(results[0].botId).toBe(TEST_BOT);
    });
  });
});
