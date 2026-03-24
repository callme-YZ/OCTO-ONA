/**
 * LocalDatabase Class (省略重复部分，只修复 JSON 解析)
 */

import mysql from 'mysql2/promise';
import {
  DataSource,
  User,
  Channel,
  Message,
  SyncMetadata,
  MessageQueryFilters,
  UserQueryFilters,
  ChannelQueryFilters,
} from './types';

export interface LocalDatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Safe JSON parse (handles pre-parsed objects from MySQL)
 */
function safeJsonParse(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value; // Already parsed
  if (typeof value === 'string') return JSON.parse(value);
  return value;
}

export class LocalDatabase {
  private pool: mysql.Pool;

  constructor(config: LocalDatabaseConfig) {
    this.pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // ============================================
  // Data Sources
  // ============================================

  async insertDataSource(ds: DataSource): Promise<void> {
    await this.pool.query(
      `INSERT INTO data_sources (id, type, name, config) 
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         name = VALUES(name),
         config = VALUES(config),
         updated_at = CURRENT_TIMESTAMP`,
      [ds.id, ds.type, ds.name, JSON.stringify(ds.config)]
    );
  }

  async getDataSource(id: string): Promise<DataSource | null> {
    const [rows]: any = await this.pool.query(
      `SELECT * FROM data_sources WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      ...row,
      config: safeJsonParse(row.config),
    };
  }

  async listDataSources(): Promise<DataSource[]> {
    const [rows]: any = await this.pool.query(
      `SELECT * FROM data_sources ORDER BY created_at DESC`
    );
    return rows.map((row: any) => ({
      ...row,
      config: safeJsonParse(row.config),
    }));
  }

  // ============================================
  // Users
  // ============================================

  async insertUsers(users: User[]): Promise<void> {
    if (users.length === 0) return;

    const values = users.map((u) => [
      u.uid,
      u.source_id,
      u.source_user_id,
      u.name || null,
      u.display_name || null,
      u.is_bot ? 1 : 0,
      u.metadata ? JSON.stringify(u.metadata) : null,
    ]);

    await this.pool.query(
      `INSERT INTO users (uid, source_id, source_user_id, name, display_name, is_bot, metadata)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         display_name = VALUES(display_name),
         metadata = VALUES(metadata),
         updated_at = CURRENT_TIMESTAMP`,
      [values]
    );
  }

  async getUser(uid: string): Promise<User | null> {
    const [rows]: any = await this.pool.query(
      `SELECT * FROM users WHERE uid = ?`,
      [uid]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      ...row,
      is_bot: Boolean(row.is_bot),
      metadata: safeJsonParse(row.metadata),
    };
  }

  async listUsers(filters: UserQueryFilters = {}): Promise<User[]> {
    let query = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];

    if (filters.source_id) {
      query += ' AND source_id = ?';
      params.push(filters.source_id);
    }

    if (filters.is_bot !== undefined) {
      query += ' AND is_bot = ?';
      params.push(filters.is_bot ? 1 : 0);
    }

    if (filters.name_like) {
      query += ' AND (name LIKE ? OR display_name LIKE ?)';
      params.push(`%${filters.name_like}%`, `%${filters.name_like}%`);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const [rows]: any = await this.pool.query(query, params);
    return rows.map((row: any) => ({
      ...row,
      is_bot: Boolean(row.is_bot),
      metadata: safeJsonParse(row.metadata),
    }));
  }

  // ============================================
  // Channels
  // ============================================

  async insertChannels(channels: Channel[]): Promise<void> {
    if (channels.length === 0) return;

    const values = channels.map((c) => [
      c.channel_id,
      c.source_id,
      c.source_channel_id,
      c.name || null,
      c.type,
      c.metadata ? JSON.stringify(c.metadata) : null,
    ]);

    await this.pool.query(
      `INSERT INTO channels (channel_id, source_id, source_channel_id, name, type, metadata)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         metadata = VALUES(metadata),
         updated_at = CURRENT_TIMESTAMP`,
      [values]
    );
  }

  async getChannel(channelId: string): Promise<Channel | null> {
    const [rows]: any = await this.pool.query(
      `SELECT * FROM channels WHERE channel_id = ?`,
      [channelId]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      ...row,
      metadata: safeJsonParse(row.metadata),
    };
  }

  async listChannels(filters: ChannelQueryFilters = {}): Promise<Channel[]> {
    let query = 'SELECT * FROM channels WHERE 1=1';
    const params: any[] = [];

    if (filters.source_id) {
      query += ' AND source_id = ?';
      params.push(filters.source_id);
    }

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.name_like) {
      query += ' AND name LIKE ?';
      params.push(`%${filters.name_like}%`);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const [rows]: any = await this.pool.query(query, params);
    return rows.map((row: any) => ({
      ...row,
      metadata: safeJsonParse(row.metadata),
    }));
  }

  // ============================================
  // Messages
  // ============================================

  async insertMessages(messages: Message[]): Promise<void> {
    if (messages.length === 0) return;

    const values = messages.map((m) => [
      m.message_id,
      m.source_id,
      m.source_message_id,
      m.channel_id,
      m.from_uid,
      m.content || null,
      m.timestamp,
      m.reply_to_message_id || null,
      m.reply_to_uid || null,
      m.mentioned_uids ? JSON.stringify(m.mentioned_uids) : null,
      m.metadata ? JSON.stringify(m.metadata) : null,
    ]);

    await this.pool.query(
      `INSERT INTO messages 
       (message_id, source_id, source_message_id, channel_id, from_uid, content, timestamp, 
        reply_to_message_id, reply_to_uid, mentioned_uids, metadata)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         content = VALUES(content),
         metadata = VALUES(metadata)`,
      [values]
    );
  }

  async queryMessages(filters: MessageQueryFilters = {}): Promise<Message[]> {
    let query = 'SELECT * FROM messages WHERE 1=1';
    const params: any[] = [];

    if (filters.source_id) {
      query += ' AND source_id = ?';
      params.push(filters.source_id);
    }

    if (filters.channel_ids && filters.channel_ids.length > 0) {
      query += ` AND channel_id IN (${filters.channel_ids.map(() => '?').join(',')})`;
      params.push(...filters.channel_ids);
    }

    if (filters.from_uid) {
      query += ' AND from_uid = ?';
      params.push(filters.from_uid);
    }

    if (filters.start_time) {
      query += ' AND timestamp >= ?';
      params.push(filters.start_time);
    }

    if (filters.end_time) {
      query += ' AND timestamp <= ?';
      params.push(filters.end_time);
    }

    if (filters.has_reply !== undefined) {
      query += filters.has_reply
        ? ' AND reply_to_message_id IS NOT NULL'
        : ' AND reply_to_message_id IS NULL';
    }

    if (filters.has_mentions !== undefined) {
      query += filters.has_mentions
        ? ' AND mentioned_uids IS NOT NULL'
        : ' AND mentioned_uids IS NULL';
    }

    query += ' ORDER BY timestamp DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const [rows]: any = await this.pool.query(query, params);
    return rows.map((row: any) => ({
      ...row,
      mentioned_uids: safeJsonParse(row.mentioned_uids),
      metadata: safeJsonParse(row.metadata),
    }));
  }

  // ============================================
  // Sync Metadata
  // ============================================

  async recordSync(sync: SyncMetadata): Promise<void> {
    await this.pool.query(
      `INSERT INTO sync_metadata 
       (source_id, last_sync_at, sync_status, messages_synced, users_synced, channels_synced, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sync.source_id,
        sync.last_sync_at,
        sync.sync_status,
        sync.messages_synced || 0,
        sync.users_synced || 0,
        sync.channels_synced || 0,
        sync.error_message || null,
      ]
    );
  }

  async getLastSync(sourceId: string): Promise<SyncMetadata | null> {
    const [rows]: any = await this.pool.query(
      `SELECT * FROM sync_metadata 
       WHERE source_id = ? 
       ORDER BY last_sync_at DESC 
       LIMIT 1`,
      [sourceId]
    );
    if (rows.length === 0) return null;
    return rows[0];
  }
}
