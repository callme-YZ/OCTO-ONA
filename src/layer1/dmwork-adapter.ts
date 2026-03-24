/**
 * OCTO-ONA Layer 1: DMWork Adapter
 * 
 * Reference implementation for DMWork database.
 * Handles 5-table message sharding and to_uids inference.
 */

import mysql from 'mysql2/promise';
import {
  BaseAdapter,
  SourceUser,
  SourceMessage,
  AdapterConfig,
} from './base-adapter';

// ============================================
// DMWork Specific Types
// ============================================

interface DMWorkConfig extends AdapterConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface DMWorkMessage {
  message_id: string;
  from_uid: string;
  channel_id: string;
  payload: Buffer | string;
  created_at: number;
}

interface PayloadData {
  mention?: {
    uids?: string[];
  };
}

// ============================================
// DMWorkAdapter Class
// ============================================

export class DMWorkAdapter extends BaseAdapter {
  private pool: mysql.Pool;
  private groupMemberCache: Map<string, string[]> = new Map();
  
  constructor(config: DMWorkConfig) {
    super(config);
    
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
  }
  
  async fetchUsers(): Promise<SourceUser[]> {
    let userRows: mysql.RowDataPacket[];
    let robotRows: mysql.RowDataPacket[];
    
    try {
      [userRows] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT uid, name, robot, email FROM user'
      );
      
      [robotRows] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT robot_id, creator_uid FROM robot'
      );
    } catch (error) {
      throw new Error(
        `[DMWork] Failed to fetch users from database: ${error instanceof Error ? error.message : 'Connection failed'}`
      );
    }
    
    const robotCreators = new Map<string, string>();
    for (const robot of robotRows) {
      robotCreators.set(robot.robot_id, robot.creator_uid);
    }
    
    const users: SourceUser[] = userRows.map(user => ({
      id: user.uid,
      name: user.name,
      is_bot: Boolean(user.robot),
      email: (user.email && user.email.includes('@')) ? user.email : undefined,
      creator_uid: Boolean(user.robot) ? robotCreators.get(user.uid) : undefined,
    }));
    
    return users;
  }
  
  async fetchMessages(
    startTime?: Date,
    endTime?: Date
  ): Promise<SourceMessage[]> {
    const tables = ['message', 'message1', 'message2', 'message3', 'message4'];
    const allMessages: SourceMessage[] = [];
    
    for (const table of tables) {
      let query = `
        SELECT 
          message_id,
          from_uid,
          channel_id,
          payload,
          created_at
        FROM ${table}
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (startTime) {
        query += ' AND created_at >= ?';
        params.push(startTime);
      }
      
      if (endTime) {
        query += ' AND created_at <= ?';
        params.push(endTime);
      }
      
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(query, params);
      
      console.log(`Fetched ${rows.length} messages from ${table}`);
      
      for (const row of rows) {
        const toUids = await this._inferToUids(row as DMWorkMessage);
        
        allMessages.push({
          id: row.message_id,
          from_uid: row.from_uid,
          to_uids: toUids,
          content: this._extractContent(row.payload),
          timestamp: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
          context_id: row.channel_id,
        });
      }
    }
    
    return allMessages;
  }
  
  /**
   * Infer message recipient UIDs from payload and group context
   * 
   * Strategy:
   * 1. Priority: Use payload.mention.uids (direct @ mentions)
   * 2. Fallback: Query group_member table (group context, max 50 members)
   * 
   * @param msg - Raw DMWork message from database
   * @returns Array of recipient UIDs
   * @private
   */
  private async _inferToUids(msg: DMWorkMessage): Promise<string[]> {
    const toUids: string[] = [];
    
    // Source 1: Direct mentions from payload
    try {
      const payloadStr = typeof msg.payload === 'string'
        ? msg.payload
        : msg.payload.toString('utf-8');
      
      const payload: PayloadData = JSON.parse(payloadStr);
      
      if (payload.mention?.uids && payload.mention.uids.length > 0) {
        toUids.push(...payload.mention.uids);
      }
    } catch (error) {
      // Log parse errors for debugging
      if (process.env.DEBUG) {
        console.warn(`[DMWork] Failed to parse payload for message ${msg.message_id}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    // Source 2: If no mentions, infer from group context (with cache)
    if (toUids.length === 0 && msg.channel_id) {
      let memberUids = this.groupMemberCache.get(msg.channel_id);
      if (!memberUids) {
        const [members] = await this.pool.query<mysql.RowDataPacket[]>(
          'SELECT uid FROM group_member WHERE group_no = ? LIMIT 50',
          [msg.channel_id]
        );
        memberUids = members.map(m => m.uid);
        this.groupMemberCache.set(msg.channel_id, memberUids);
      }
      
      toUids.push(...memberUids.filter(uid => uid !== msg.from_uid));
    }
    
    return toUids;
  }
  
  /**
   * Extract text content from DMWork message payload
   * 
   * Attempts to parse payload JSON and extract content/text fields.
   * Returns empty string if parsing fails (malformed JSON).
   * 
   * @param payload - Raw payload (Buffer or JSON string)
   * @returns Extracted text content, or empty string
   * @private
   */
  private _extractContent(payload: Buffer | string): string {
    try {
      const payloadStr = typeof payload === 'string'
        ? payload
        : payload.toString('utf-8');
      
      const data = JSON.parse(payloadStr);
      return data.content || data.text || '';
    } catch (error) {
      // Return empty string for malformed payloads
      if (process.env.DEBUG) {
        console.warn('[DMWork] Failed to extract content from payload:', error instanceof Error ? error.message : 'Unknown error');
      }
      return '';
    }
  }
  
  async close(): Promise<void> {
    await this.pool.end();
  }
}
