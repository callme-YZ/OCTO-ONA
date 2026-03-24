/**
 * OCTO-ONA Layer 1: OCTO Adapter (v2.0)
 * 
 * Adapter for OCTO Internal IM platform (DMWork backend).
 * Supports 3 modes:
 *   - remote: Direct remote DB access (legacy)
 *   - local: Read from local cache
 *   - sync: Sync remote → local
 */

import mysql from 'mysql2/promise';
import { NetworkGraph, Message as GraphMessage } from '../../layer2/models';
import { NetworkGraphBuilder } from '../network-graph-builder';
import { LocalDatabase, LocalDatabaseConfig } from '../../database/local-database';
import { User, Channel, Message as DBMessage } from '../../database/types';

// ============================================
// OCTO Specific Types
// ============================================

export interface OCTOConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface OCTOAdapterConfig {
  mode: 'remote' | 'local' | 'sync';
  remoteConfig?: OCTOConfig;
  localConfig?: LocalDatabaseConfig;
  sourceId: string; // e.g., 'dmwork-octo'
}

export interface OCTOExtractionOptions {
  startTime?: Date;
  endTime?: Date;
  channelIds?: string[];
}

interface RemoteDBMessage {
  message_id: string;
  from_uid: string;
  channel_id: string;
  channel_type: number;
  payload: Buffer | string;
  created_at: number;
}

interface PayloadData {
  mention?: {
    uids?: string[];
  };
  reply?: {
    message_id?: string;
    from_uid?: string;
  };
  content?: string;
}

interface RemoteDBUser {
  uid: string;
  name: string;
  username?: string;
  robot?: number;
  robot_version?: string;
}

interface RemoteDBChannel {
  channel_id: string;
  channel_type: number;
}

// ============================================
// OCTOAdapter Class (v2.0)
// ============================================

export class OCTOAdapter {
  private config: OCTOAdapterConfig;
  private remotePool?: mysql.Pool;
  private localDB?: LocalDatabase;

  constructor(config: OCTOAdapterConfig) {
    this.config = config;
  }

  /**
   * Connect to database(s) based on mode
   */
  async connect(): Promise<void> {
    if (this.config.mode === 'remote' || this.config.mode === 'sync') {
      if (!this.config.remoteConfig) {
        throw new Error('remoteConfig required for remote/sync mode');
      }

      this.remotePool = mysql.createPool({
        ...this.config.remoteConfig,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      // Test connection
      const conn = await this.remotePool.getConnection();
      conn.release();
    }

    if (this.config.mode === 'local' || this.config.mode === 'sync') {
      if (!this.config.localConfig) {
        throw new Error('localConfig required for local/sync mode');
      }

      this.localDB = new LocalDatabase(this.config.localConfig);

      // Ensure data source exists
      await this.localDB.insertDataSource({
        id: this.config.sourceId,
        type: 'dmwork',
        name: 'OCTO Internal IM',
        config: this.config.remoteConfig || {},
      });
    }
  }

  /**
   * Sync data from remote to local
   */
  async syncToLocal(options: OCTOExtractionOptions = {}): Promise<void> {
    if (this.config.mode !== 'sync') {
      throw new Error('syncToLocal only available in sync mode');
    }

    if (!this.remotePool || !this.localDB) {
      throw new Error('Not connected. Call connect() first.');
    }

    console.log('🔄 Syncing data from remote to local...');

    // Step 1: Sync users
    console.log('  📥 Syncing users...');
    const remoteUsers = await this.extractRemoteUsers();
    const localUsers: User[] = remoteUsers.map(u => ({
      uid: `${this.config.sourceId}:${u.uid}`,
      source_id: this.config.sourceId,
      source_user_id: u.uid,
      name: u.name,
      display_name: u.username || u.name,
      is_bot: u.robot === 1,
      metadata: u.robot === 1 ? { creator_uid: u.robot_version } : {},
    }));
    await this.localDB.insertUsers(localUsers);
    console.log(`  ✅ Synced ${localUsers.length} users`);

    // Step 2: Sync channels
    console.log('  📥 Syncing channels...');
    const remoteChannels = await this.extractRemoteChannels();
    const localChannels: Channel[] = remoteChannels.map(c => ({
      channel_id: `${this.config.sourceId}:${c.channel_id}`,
      source_id: this.config.sourceId,
      source_channel_id: c.channel_id,
      name: c.channel_id, // OCTO doesn't have channel names, use ID
      type: c.channel_type === 1 ? 'dm' : 'group',
    }));
    await this.localDB.insertChannels(localChannels);
    console.log(`  ✅ Synced ${localChannels.length} channels`);

    // Step 3: Sync messages
    console.log('  📥 Syncing messages...');
    const remoteMessages = await this.extractRemoteMessages(options);
    const localMessages: DBMessage[] = remoteMessages.map(msg => {
      const payload = this.parsePayload(msg.payload);
      const toUids = this.inferToUids(msg, payload);

      return {
        message_id: `${this.config.sourceId}:${msg.message_id}`,
        source_id: this.config.sourceId,
        source_message_id: msg.message_id,
        channel_id: `${this.config.sourceId}:${msg.channel_id}`,
        from_uid: `${this.config.sourceId}:${msg.from_uid}`,
        content: payload.content || '',
        timestamp: Math.floor(msg.created_at / 1000), // Convert ms to seconds
        reply_to_message_id: payload.reply?.message_id
          ? `${this.config.sourceId}:${payload.reply.message_id}`
          : undefined,
        reply_to_uid: payload.reply?.from_uid
          ? `${this.config.sourceId}:${payload.reply.from_uid}`
          : undefined,
        mentioned_uids: payload.mention?.uids?.map(uid => `${this.config.sourceId}:${uid}`),
        metadata: { channel_type: msg.channel_type },
      };
    });
    await this.localDB.insertMessages(localMessages);
    console.log(`  ✅ Synced ${localMessages.length} messages`);

    // Step 4: Record sync status
    await this.localDB.recordSync({
      source_id: this.config.sourceId,
      last_sync_at: new Date(),
      sync_status: 'success',
      messages_synced: localMessages.length,
      users_synced: localUsers.length,
      channels_synced: localChannels.length,
    });

    console.log('✅ Sync complete!');
  }

  /**
   * Extract network graph (works in all modes)
   */
  async extractNetwork(options: OCTOExtractionOptions = {}): Promise<NetworkGraph> {
    if (this.config.mode === 'remote') {
      return this.extractFromRemote(options);
    } else if (this.config.mode === 'local') {
      return this.extractFromLocal(options);
    } else {
      throw new Error('extractNetwork not supported in sync mode. Use syncToLocal() first, then switch to local mode.');
    }
  }

  /**
   * Extract from remote database (legacy mode)
   */
  private async extractFromRemote(options: OCTOExtractionOptions): Promise<NetworkGraph> {
    if (!this.remotePool) {
      throw new Error('Not connected. Call connect() first.');
    }

    // Extract users
    const dbUsers = await this.extractRemoteUsers();
    const users = dbUsers.map(u => ({
      id: u.uid,
      name: u.name,
      is_bot: u.robot === 1,
      creator_uid: u.robot_version,
    }));
    
    const { humans, bots } = NetworkGraphBuilder.separateUsers(users);

    // Extract messages
    const dbMessages = await this.extractRemoteMessages(options);
    const messages: GraphMessage[] = [];
    
    for (const msg of dbMessages) {
      const payload = this.parsePayload(msg.payload);
      const toUids = this.inferToUids(msg, payload);

      messages.push({
        id: msg.message_id,
        from_uid: msg.from_uid,
        to_uids: toUids,
        content: payload.content || '',
        timestamp: new Date(msg.created_at),
        platform: 'octo',
        context_id: msg.channel_id,
      });
    }

    // Build edges
    const humanIds = new Set(humans.map(h => h.id));
    const botIds = new Set(bots.map(b => b.id));
    
    const msgForEdges = messages.map(m => ({
      id: m.id,
      from: m.from_uid,
      to: m.to_uids,
      timestamp: m.timestamp,
    }));
    
    const edges = NetworkGraphBuilder.buildEdges(msgForEdges, humanIds, botIds);

    // Calculate time range
    const timestamps = messages.map(m => m.timestamp.getTime());
    const startTime = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date();
    const endTime = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();

    return NetworkGraphBuilder.build({
      graphId: `octo_remote_${Date.now()}`,
      description: 'OCTO Internal IM Network (Remote)',
      startTime,
      endTime,
      humans,
      bots,
      edges,
      messages,
    });
  }

  /**
   * Extract from local database
   */
  private async extractFromLocal(options: OCTOExtractionOptions): Promise<NetworkGraph> {
    if (!this.localDB) {
      throw new Error('Not connected. Call connect() first.');
    }

    // Extract users
    const dbUsers = await this.localDB.listUsers({ source_id: this.config.sourceId });
    const users = dbUsers.map(u => ({
      id: u.source_user_id, // Use original ID (without source prefix)
      name: u.name || u.source_user_id,
      is_bot: u.is_bot,
      creator_uid: u.metadata?.creator_uid,
    }));
    
    const { humans, bots } = NetworkGraphBuilder.separateUsers(users);

    // Extract messages
    const startTime = options.startTime ? Math.floor(options.startTime.getTime() / 1000) : undefined;
    const endTime = options.endTime ? Math.floor(options.endTime.getTime() / 1000) : undefined;
    const channelIds = options.channelIds?.map(id => `${this.config.sourceId}:${id}`);

    const dbMessages = await this.localDB.queryMessages({
      source_id: this.config.sourceId,
      start_time: startTime,
      end_time: endTime,
      channel_ids: channelIds,
    });

    const messages: GraphMessage[] = dbMessages.map(msg => {
      // Extract original IDs (remove source prefix)
      const fromUid = msg.from_uid.replace(`${this.config.sourceId}:`, '');
      const toUids = msg.mentioned_uids?.map((uid: string) => uid.replace(`${this.config.sourceId}:`, '')) || [];
      
      if (toUids.length === 0) {
        // Fallback: broadcast to channel
        toUids.push(msg.channel_id.replace(`${this.config.sourceId}:`, ''));
      }

      return {
        id: msg.source_message_id,
        from_uid: fromUid,
        to_uids: toUids,
        content: msg.content || '',
        timestamp: new Date(msg.timestamp * 1000),
        platform: 'octo',
        context_id: msg.channel_id.replace(`${this.config.sourceId}:`, ''),
      };
    });

    // Build edges
    const humanIds = new Set(humans.map(h => h.id));
    const botIds = new Set(bots.map(b => b.id));
    
    const msgForEdges = messages.map(m => ({
      id: m.id,
      from: m.from_uid,
      to: m.to_uids,
      timestamp: m.timestamp,
    }));
    
    const edges = NetworkGraphBuilder.buildEdges(msgForEdges, humanIds, botIds);

    // Calculate time range
    const timestamps = messages.map(m => m.timestamp.getTime());
    const graphStartTime = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date();
    const graphEndTime = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();

    return NetworkGraphBuilder.build({
      graphId: `octo_local_${Date.now()}`,
      description: 'OCTO Internal IM Network (Local)',
      startTime: graphStartTime,
      endTime: graphEndTime,
      humans,
      bots,
      edges,
      messages,
    });
  }

  /**
   * Disconnect from database(s)
   */
  async disconnect(): Promise<void> {
    if (this.remotePool) {
      await this.remotePool.end();
      this.remotePool = undefined;
    }

    if (this.localDB) {
      await this.localDB.close();
      this.localDB = undefined;
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async extractRemoteUsers(): Promise<RemoteDBUser[]> {
    if (!this.remotePool) throw new Error('Not connected to remote');

    const [rows] = await this.remotePool.query<mysql.RowDataPacket[]>(
      'SELECT uid, name, username, robot, robot_version FROM user'
    );

    return rows.map(row => ({
      uid: row.uid,
      name: row.name,
      username: row.username,
      robot: row.robot,
      robot_version: row.robot_version,
    }));
  }

  private async extractRemoteChannels(): Promise<RemoteDBChannel[]> {
    if (!this.remotePool) throw new Error('Not connected to remote');

    // Extract unique channels from message tables
    const channelSet = new Set<string>();
    const tables = ['message', 'message1', 'message2', 'message3', 'message4'];

    for (const table of tables) {
      try {
        const [rows] = await this.remotePool.query<mysql.RowDataPacket[]>(
          `SELECT DISTINCT channel_id, channel_type FROM ${table} LIMIT 10000`
        );

        rows.forEach(row => channelSet.add(JSON.stringify({ channel_id: row.channel_id, channel_type: row.channel_type })));
      } catch (error) {
        console.warn(`Table ${table} query failed (may not exist)`);
      }
    }

    return Array.from(channelSet).map(json => JSON.parse(json));
  }

  private async extractRemoteMessages(options: OCTOExtractionOptions): Promise<RemoteDBMessage[]> {
    if (!this.remotePool) throw new Error('Not connected to remote');

    const allMessages: RemoteDBMessage[] = [];
    const tables = ['message', 'message1', 'message2', 'message3', 'message4'];

    for (const table of tables) {
      let query = `SELECT message_id, from_uid, channel_id, channel_type, payload, created_at FROM ${table} WHERE 1=1`;
      const params: any[] = [];

      if (options.startTime) {
        query += ' AND created_at >= ?';
        params.push(options.startTime.getTime());
      }

      if (options.endTime) {
        query += ' AND created_at <= ?';
        params.push(options.endTime.getTime());
      }

      if (options.channelIds && options.channelIds.length > 0) {
        query += ' AND channel_id IN (?)';
        params.push(options.channelIds);
      }

      try {
        const [rows] = await this.remotePool.query<mysql.RowDataPacket[]>(query, params);

        const messages = rows.map(row => ({
          message_id: row.message_id,
          from_uid: row.from_uid,
          channel_id: row.channel_id,
          channel_type: row.channel_type,
          payload: row.payload,
          created_at: row.created_at,
        }));

        allMessages.push(...messages);
      } catch (error) {
        console.warn(`Table ${table} query failed (may not exist)`);
      }
    }

    return allMessages;
  }

  private parsePayload(payload: Buffer | string): PayloadData {
    try {
      const payloadStr = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;
      return JSON.parse(payloadStr);
    } catch {
      return {};
    }
  }

  private inferToUids(msg: RemoteDBMessage, payload: PayloadData): string[] {
    const toUids: string[] = [];

    // 1. Explicit mentions
    if (payload.mention?.uids && payload.mention.uids.length > 0) {
      toUids.push(...payload.mention.uids);
    }

    // 2. Reply target
    if (payload.reply?.from_uid) {
      toUids.push(payload.reply.from_uid);
    }

    // 3. Default: broadcast to channel (group chat)
    if (toUids.length === 0) {
      toUids.push(msg.channel_id);
    }

    return toUids;
  }
}
