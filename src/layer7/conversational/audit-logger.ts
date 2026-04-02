/**
 * Layer 7: Conversational ONA - Audit Logger
 * 
 * 查询审计日志：记录所有对话查询
 */

import { Pool } from 'mysql2/promise';
import { IAuditLogger } from './interfaces';
import { QueryAuditLog, IntentType } from './types';
import { randomUUID } from 'crypto';

/**
 * 审计日志配置
 */
export interface AuditLoggerConfig {
  db: Pool; // MySQL 连接池
}

/**
 * 审计日志实现
 */
export class AuditLogger implements IAuditLogger {
  private db: Pool;

  constructor(config: AuditLoggerConfig) {
    this.db = config.db;
  }

  /**
   * 记录查询日志
   */
  async log(logEntry: QueryAuditLog): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO conversational_query_logs 
         (id, timestamp, user_id, query, intent, success, execution_time_ms, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logEntry.id,
          logEntry.timestamp,
          logEntry.userId,
          logEntry.query,
          logEntry.intent,
          logEntry.success ? 1 : 0,
          logEntry.executionTimeMs,
          logEntry.error || null
        ]
      );

      console.log(`[AuditLogger] Logged query: ${logEntry.id} (user=${logEntry.userId}, intent=${logEntry.intent}, success=${logEntry.success})`);
    } catch (error) {
      console.error('[AuditLogger] Failed to log query:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 查询审计日志
   */
  async query(filters: {
    userId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<QueryAuditLog[]> {
    try {
      let sql = 'SELECT * FROM conversational_query_logs WHERE 1=1';
      const params: any[] = [];

      if (filters.userId) {
        sql += ' AND user_id = ?';
        params.push(filters.userId);
      }

      if (filters.startTime) {
        sql += ' AND timestamp >= ?';
        params.push(filters.startTime);
      }

      if (filters.endTime) {
        sql += ' AND timestamp <= ?';
        params.push(filters.endTime);
      }

      sql += ' ORDER BY timestamp DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      const [rows] = await this.db.query<any[]>(sql, params);

      return rows.map((row: any) => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        userId: row.user_id,
        query: row.query,
        intent: row.intent as IntentType,
        success: row.success === 1,
        executionTimeMs: row.execution_time_ms,
        error: row.error || undefined
      }));
    } catch (error) {
      console.error('[AuditLogger] Failed to query logs:', error);
      return [];
    }
  }

  /**
   * 创建新的审计日志条目（辅助方法）
   */
  createLogEntry(
    userId: string,
    query: string,
    intent: IntentType,
    success: boolean,
    executionTimeMs: number,
    error?: string
  ): QueryAuditLog {
    return {
      id: randomUUID(),
      timestamp: new Date(),
      userId,
      query,
      intent,
      success,
      executionTimeMs,
      error
    };
  }
}
