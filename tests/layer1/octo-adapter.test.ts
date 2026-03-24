/**
 * OCTOAdapter Tests
 */

import { OCTOAdapter } from '../../src/layer1/adapters/octo-adapter';
import { LocalDatabase } from '../../src/database/local-database';

const REMOTE_CONFIG = {
  host: process.env.OCTO_REMOTE_HOST || 'localhost',
  port: parseInt(process.env.OCTO_REMOTE_PORT || '13306'),
  user: process.env.OCTO_REMOTE_USER || 'readonly',
  password: process.env.OCTO_REMOTE_PASSWORD || '',
  database: 'im',
};

const LOCAL_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'octo_ona',
};

const SOURCE_ID = 'test_octo_adapter';

describe('OCTOAdapter', () => {
  let localDB: LocalDatabase;

  beforeAll(() => {
    localDB = new LocalDatabase(LOCAL_CONFIG);
  });

  afterAll(async () => {
    // Clean up test data
    await (localDB as any).pool.query('DELETE FROM sync_metadata WHERE source_id = ?', [SOURCE_ID]);
    await (localDB as any).pool.query('DELETE FROM messages WHERE source_id = ?', [SOURCE_ID]);
    await (localDB as any).pool.query('DELETE FROM users WHERE source_id = ?', [SOURCE_ID]);
    await (localDB as any).pool.query('DELETE FROM channels WHERE source_id = ?', [SOURCE_ID]);
    await (localDB as any).pool.query('DELETE FROM data_sources WHERE id = ?', [SOURCE_ID]);
    await localDB.close();
  });

  describe('Mode: local', () => {
    it('should connect in local mode', async () => {
      const adapter = new OCTOAdapter({
        mode: 'local',
        localConfig: LOCAL_CONFIG,
        sourceId: SOURCE_ID,
      });

      await expect(adapter.connect()).resolves.not.toThrow();
      await adapter.disconnect();
    });

    it('should extract network from local DB (after manual insert)', async () => {
      // Manually insert test data
      await localDB.insertDataSource({ id: SOURCE_ID, type: 'dmwork', name: 'Test OCTO', config: {} });
      await localDB.insertUsers([
        { uid: `${SOURCE_ID}:user1`, source_id: SOURCE_ID, source_user_id: 'user1', name: 'User 1', is_bot: false },
        { uid: `${SOURCE_ID}:bot1`, source_id: SOURCE_ID, source_user_id: 'bot1', name: 'Bot 1', is_bot: true },
      ]);
      await localDB.insertChannels([
        { channel_id: `${SOURCE_ID}:channel1`, source_id: SOURCE_ID, source_channel_id: 'channel1', name: 'Ch1', type: 'group' },
      ]);
      await localDB.insertMessages([
        {
          message_id: `${SOURCE_ID}:msg1`,
          source_id: SOURCE_ID,
          source_message_id: 'msg1',
          channel_id: `${SOURCE_ID}:channel1`,
          from_uid: `${SOURCE_ID}:user1`,
          content: 'Hello',
          timestamp: Math.floor(Date.now() / 1000),
          mentioned_uids: [`${SOURCE_ID}:bot1`],
        },
      ]);

      const adapter = new OCTOAdapter({
        mode: 'local',
        localConfig: LOCAL_CONFIG,
        sourceId: SOURCE_ID,
      });

      await adapter.connect();
      const graph = await adapter.extractNetwork();
      await adapter.disconnect();

      expect(graph).toBeDefined();
      expect(graph.human_nodes.length).toBeGreaterThanOrEqual(1);
      expect(graph.ai_agent_nodes.length).toBeGreaterThanOrEqual(1);
      expect(graph.messages?.length || 0).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Mode: sync (integration test, requires remote DB)', () => {
    it.skip('should sync data from remote to local', async () => {
      // This test requires real remote DB connection
      // Skip by default, run manually with: npm test -- --testNamePattern="should sync"

      const adapter = new OCTOAdapter({
        mode: 'sync',
        remoteConfig: REMOTE_CONFIG,
        localConfig: LOCAL_CONFIG,
        sourceId: SOURCE_ID,
      });

      await adapter.connect();
      await adapter.syncToLocal({
        startTime: new Date(Date.now() - 7 * 24 * 3600 * 1000), // Last 7 days
      });
      await adapter.disconnect();

      // Verify data was synced
      const users = await localDB.listUsers({ source_id: SOURCE_ID });
      const messages = await localDB.queryMessages({ source_id: SOURCE_ID, limit: 10 });

      expect(users.length).toBeGreaterThan(0);
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Config validation', () => {
    it('should throw error if mode=remote but no remoteConfig', async () => {
      const adapter = new OCTOAdapter({
        mode: 'remote',
        sourceId: SOURCE_ID,
      } as any);

      await expect(adapter.connect()).rejects.toThrow('remoteConfig required');
    });

    it('should throw error if mode=local but no localConfig', async () => {
      const adapter = new OCTOAdapter({
        mode: 'local',
        sourceId: SOURCE_ID,
      } as any);

      await expect(adapter.connect()).rejects.toThrow('localConfig required');
    });

    it('should throw error if extractNetwork called in sync mode', async () => {
      const adapter = new OCTOAdapter({
        mode: 'sync',
        remoteConfig: REMOTE_CONFIG,
        localConfig: LOCAL_CONFIG,
        sourceId: SOURCE_ID,
      });

      // Don't actually connect to remote in unit test
      await expect(adapter.extractNetwork()).rejects.toThrow('not supported in sync mode');
    });
  });
});
