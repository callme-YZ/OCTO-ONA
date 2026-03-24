/**
 * LocalDatabase Class Tests
 */

import { LocalDatabase } from '../../src/database/local-database';
import { DataSource, User, Channel, Message, SyncMetadata } from '../../src/database/types';

const TEST_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'octo_ona',
};

describe('LocalDatabase', () => {
  let db: LocalDatabase;

  beforeAll(() => {
    db = new LocalDatabase(TEST_CONFIG);
  });

  afterAll(async () => {
    await db.close();
  });

  // Clean up test data before each test
  beforeEach(async () => {
    // Delete test data (keep schema intact)
    const cleanupQueries = [
      'DELETE FROM sync_metadata WHERE source_id LIKE "test_%"',
      'DELETE FROM messages WHERE source_id LIKE "test_%"',
      'DELETE FROM users WHERE source_id LIKE "test_%"',
      'DELETE FROM channels WHERE source_id LIKE "test_%"',
      'DELETE FROM data_sources WHERE id LIKE "test_%"',
    ];
    
    for (const query of cleanupQueries) {
      await (db as any).pool.query(query);
    }
  });

  // ============================================
  // Data Sources Tests
  // ============================================

  describe('Data Sources', () => {
    it('should insert and retrieve data source', async () => {
      const ds: DataSource = {
        id: 'test_source1',
        type: 'dmwork',
        name: 'Test Source',
        config: { host: 'localhost', port: 3306 },
      };

      await db.insertDataSource(ds);
      const retrieved = await db.getDataSource('test_source1');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('test_source1');
      expect(retrieved!.type).toBe('dmwork');
      expect(retrieved!.config.host).toBe('localhost');
    });

    it('should list all data sources', async () => {
      await db.insertDataSource({ id: 'test_source1', type: 'dmwork', name: 'Test 1', config: {} });
      await db.insertDataSource({ id: 'test_source2', type: 'discord', name: 'Test 2', config: {} });

      const sources = await db.listDataSources();
      const testSources = sources.filter((s) => s.id.startsWith('test_'));

      expect(testSources.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // Users Tests
  // ============================================

  describe('Users', () => {
    beforeEach(async () => {
      await db.insertDataSource({ id: 'test_source1', type: 'dmwork', name: 'Test', config: {} });
    });

    it('should insert and retrieve user', async () => {
      const user: User = {
        uid: 'test_source1:user123',
        source_id: 'test_source1',
        source_user_id: 'user123',
        name: 'Test User',
        display_name: 'TUser',
        is_bot: false,
      };

      await db.insertUsers([user]);
      const retrieved = await db.getUser('test_source1:user123');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe('Test User');
      expect(retrieved!.is_bot).toBe(false);
    });

    it('should batch insert users', async () => {
      const users: User[] = [
        { uid: 'test_source1:user1', source_id: 'test_source1', source_user_id: 'user1', name: 'User 1', is_bot: false },
        { uid: 'test_source1:user2', source_id: 'test_source1', source_user_id: 'user2', name: 'User 2', is_bot: true },
      ];

      await db.insertUsers(users);
      const list = await db.listUsers({ source_id: 'test_source1' });

      expect(list.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter users by is_bot', async () => {
      const users: User[] = [
        { uid: 'test_source1:user1', source_id: 'test_source1', source_user_id: 'user1', name: 'User 1', is_bot: false },
        { uid: 'test_source1:bot1', source_id: 'test_source1', source_user_id: 'bot1', name: 'Bot 1', is_bot: true },
      ];

      await db.insertUsers(users);
      const bots = await db.listUsers({ source_id: 'test_source1', is_bot: true });
      const humans = await db.listUsers({ source_id: 'test_source1', is_bot: false });

      expect(bots.length).toBeGreaterThanOrEqual(1);
      expect(humans.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================
  // Channels Tests
  // ============================================

  describe('Channels', () => {
    beforeEach(async () => {
      await db.insertDataSource({ id: 'test_source1', type: 'dmwork', name: 'Test', config: {} });
    });

    it('should insert and retrieve channel', async () => {
      const channel: Channel = {
        channel_id: 'test_source1:channel123',
        source_id: 'test_source1',
        source_channel_id: 'channel123',
        name: 'Test Channel',
        type: 'group',
      };

      await db.insertChannels([channel]);
      const retrieved = await db.getChannel('test_source1:channel123');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe('Test Channel');
      expect(retrieved!.type).toBe('group');
    });

    it('should filter channels by type', async () => {
      const channels: Channel[] = [
        { channel_id: 'test_source1:dm1', source_id: 'test_source1', source_channel_id: 'dm1', name: 'DM', type: 'dm' },
        { channel_id: 'test_source1:group1', source_id: 'test_source1', source_channel_id: 'group1', name: 'Group', type: 'group' },
      ];

      await db.insertChannels(channels);
      const dms = await db.listChannels({ source_id: 'test_source1', type: 'dm' });

      expect(dms.length).toBeGreaterThanOrEqual(1);
      expect(dms[0].type).toBe('dm');
    });
  });

  // ============================================
  // Messages Tests
  // ============================================

  describe('Messages', () => {
    beforeEach(async () => {
      await db.insertDataSource({ id: 'test_source1', type: 'dmwork', name: 'Test', config: {} });
      await db.insertUsers([
        { uid: 'test_source1:user1', source_id: 'test_source1', source_user_id: 'user1', name: 'User 1', is_bot: false },
      ]);
      await db.insertChannels([
        { channel_id: 'test_source1:channel1', source_id: 'test_source1', source_channel_id: 'channel1', name: 'Ch1', type: 'group' },
      ]);
    });

    it('should insert and query messages', async () => {
      const message: Message = {
        message_id: 'test_source1:msg123',
        source_id: 'test_source1',
        source_message_id: 'msg123',
        channel_id: 'test_source1:channel1',
        from_uid: 'test_source1:user1',
        content: 'Hello world',
        timestamp: Math.floor(Date.now() / 1000),
      };

      await db.insertMessages([message]);
      const messages = await db.queryMessages({ source_id: 'test_source1' });

      expect(messages.length).toBeGreaterThanOrEqual(1);
      expect(messages[0].content).toBe('Hello world');
    });

    it('should filter messages by time range', async () => {
      const now = Math.floor(Date.now() / 1000);
      const messages: Message[] = [
        {
          message_id: 'test_source1:msg1',
          source_id: 'test_source1',
          source_message_id: 'msg1',
          channel_id: 'test_source1:channel1',
          from_uid: 'test_source1:user1',
          content: 'Old message',
          timestamp: now - 3600,
        },
        {
          message_id: 'test_source1:msg2',
          source_id: 'test_source1',
          source_message_id: 'msg2',
          channel_id: 'test_source1:channel1',
          from_uid: 'test_source1:user1',
          content: 'New message',
          timestamp: now,
        },
      ];

      await db.insertMessages(messages);
      const recent = await db.queryMessages({
        source_id: 'test_source1',
        start_time: now - 60,
      });

      expect(recent.length).toBeGreaterThanOrEqual(1);
      expect(recent[0].content).toBe('New message');
    });

    it('should filter messages by channel', async () => {
      await db.insertChannels([
        { channel_id: 'test_source1:channel2', source_id: 'test_source1', source_channel_id: 'channel2', name: 'Ch2', type: 'group' },
      ]);

      const messages: Message[] = [
        {
          message_id: 'test_source1:msg1',
          source_id: 'test_source1',
          source_message_id: 'msg1',
          channel_id: 'test_source1:channel1',
          from_uid: 'test_source1:user1',
          content: 'Channel 1',
          timestamp: Math.floor(Date.now() / 1000),
        },
        {
          message_id: 'test_source1:msg2',
          source_id: 'test_source1',
          source_message_id: 'msg2',
          channel_id: 'test_source1:channel2',
          from_uid: 'test_source1:user1',
          content: 'Channel 2',
          timestamp: Math.floor(Date.now() / 1000),
        },
      ];

      await db.insertMessages(messages);
      const ch1Messages = await db.queryMessages({
        source_id: 'test_source1',
        channel_ids: ['test_source1:channel1'],
      });

      expect(ch1Messages.length).toBeGreaterThanOrEqual(1);
      expect(ch1Messages[0].channel_id).toBe('test_source1:channel1');
    });
  });

  // ============================================
  // Sync Metadata Tests
  // ============================================

  describe('Sync Metadata', () => {
    beforeEach(async () => {
      await db.insertDataSource({ id: 'test_source1', type: 'dmwork', name: 'Test', config: {} });
    });

    it('should record sync metadata', async () => {
      const sync: SyncMetadata = {
        source_id: 'test_source1',
        last_sync_at: new Date(),
        sync_status: 'success',
        messages_synced: 100,
        users_synced: 10,
        channels_synced: 5,
      };

      await db.recordSync(sync);
      const lastSync = await db.getLastSync('test_source1');

      expect(lastSync).not.toBeNull();
      expect(lastSync!.sync_status).toBe('success');
      expect(lastSync!.messages_synced).toBe(100);
    });

    it('should return most recent sync', async () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 3600 * 1000);

      await db.recordSync({
        source_id: 'test_source1',
        last_sync_at: hourAgo,
        sync_status: 'success',
        messages_synced: 50,
      });

      await db.recordSync({
        source_id: 'test_source1',
        last_sync_at: now,
        sync_status: 'success',
        messages_synced: 100,
      });

      const lastSync = await db.getLastSync('test_source1');

      expect(lastSync).not.toBeNull();
      expect(lastSync!.messages_synced).toBe(100);
    });
  });
});
