/**
 * OCTO-ONA Layer 1: OCTO Adapter
 * 
 * Adapter for OCTO Internal IM platform (DMWork backend).
 * Connects directly to MySQL database and extracts network data.
 */

import mysql from 'mysql2/promise';
import { NetworkGraph, Message } from '../../layer2/models';
import { NetworkGraphBuilder } from '../network-graph-builder';

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

export interface OCTOExtractionOptions {
  startTime?: Date;
  endTime?: Date;
  channelIds?: string[];
}

interface DBMessage {
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
}

interface DBUser {
  uid: string;
  name: string;
  username?: string;
  robot?: number;
  robot_version?: string;
}

// ============================================
// OCTOAdapter Class
// ============================================

export class OCTOAdapter {
  private pool?: mysql.Pool;
  private config?: OCTOConfig;

  /**
   * Connect to OCTO database
   */
  async connect(config: OCTOConfig): Promise<void> {
    this.config = config;
    
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Test connection
    try {
      const connection = await this.pool.getConnection();
      connection.release();
    } catch (error) {
      throw new Error(`Failed to connect to OCTO database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract network graph from OCTO database
   */
  async extractNetwork(options: OCTOExtractionOptions = {}): Promise<NetworkGraph> {
    if (!this.pool) {
      throw new Error('Not connected. Call connect() first.');
    }

    // Step 1: Extract users
    const dbUsers = await this.extractUsers();
    const users = dbUsers.map(u => ({
      id: u.uid,
      name: u.name,
      is_bot: u.robot === 1,
      creator_uid: u.robot_version,
    }));
    
    const { humans, bots } = NetworkGraphBuilder.separateUsers(users);

    // Step 2: Extract messages
    const dbMessages = await this.extractMessages(options);
    const messages: Message[] = [];
    
    for (const msg of dbMessages) {
      const payload = this.parsePayload(msg.payload);
      const toUids = this.inferToUids(msg, payload);

      messages.push({
        id: msg.message_id,
        from_uid: msg.from_uid,
        to_uids: toUids,
        content: '', // Empty content for privacy
        timestamp: new Date(msg.created_at),
        platform: 'octo',
        context_id: msg.channel_id,
      });
    }

    // Step 3: Build edges
    const humanIds = new Set(humans.map(h => h.id));
    const botIds = new Set(bots.map(b => b.id));
    
    // Convert messages to buildEdges format
    const msgForEdges = messages.map(m => ({
      id: m.id,
      from: m.from_uid,
      to: m.to_uids,
      timestamp: m.timestamp,
    }));
    
    const edges = NetworkGraphBuilder.buildEdges(msgForEdges, humanIds, botIds);

    // Step 4: Calculate time range
    const timestamps = messages.map(m => m.timestamp.getTime());
    const startTime = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date();
    const endTime = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();

    // Step 5: Build graph
    return NetworkGraphBuilder.build({
      graphId: `octo_${Date.now()}`,
      description: 'OCTO Internal IM Network',
      startTime,
      endTime,
      humans,
      bots,
      edges,
      messages,
    });
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async extractUsers(): Promise<DBUser[]> {
    if (!this.pool) throw new Error('Not connected');

    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
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

  private async extractMessages(options: OCTOExtractionOptions): Promise<DBMessage[]> {
    if (!this.pool) throw new Error('Not connected');

    const allMessages: DBMessage[] = [];
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
        const [rows] = await this.pool.query<mysql.RowDataPacket[]>(query, params);

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
        // Skip tables that don't exist yet
        console.warn(`Table ${table} query failed (may not exist):`, error);
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

  private inferToUids(msg: DBMessage, payload: PayloadData): string[] {
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
