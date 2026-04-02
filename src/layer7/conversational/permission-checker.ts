/**
 * Layer 7: Conversational ONA - Permission Checker
 * 
 * 细粒度权限控制：只能查自己 + 自己的 Bot
 */

import { Pool } from 'mysql2/promise';
import { IPermissionChecker } from './interfaces';
import { ParsedIntent, PermissionCheckResult, UserPermissionContext } from './types';

/**
 * 权限检查器配置
 */
export interface PermissionCheckerConfig {
  db: Pool; // MySQL 连接池
}

/**
 * 权限检查器实现
 */
export class PermissionChecker implements IPermissionChecker {
  private db: Pool;

  constructor(config: PermissionCheckerConfig) {
    this.db = config.db;
  }

  /**
   * 检查用户是否有权限执行该查询
   */
  async check(
    userContext: UserPermissionContext,
    intent: ParsedIntent
  ): Promise<PermissionCheckResult> {
    const { userId, ownedBots } = userContext;
    const { params } = intent;

    // 1. 提取目标对象
    const targetUser = params.targetUser;
    const targetBot = params.targetBot;

    // 2. 如果没有指定目标，默认允许（查询自己）
    if (!targetUser && !targetBot) {
      return {
        allowed: true,
        allowedTargets: [userId, ...ownedBots]
      };
    }

    // 3. 检查 targetUser
    if (targetUser) {
      // 特殊值 "self" 总是允许
      if (targetUser === 'self') {
        return {
          allowed: true,
          allowedTargets: [userId]
        };
      }

      // 检查是否是自己
      if (targetUser === userId) {
        return {
          allowed: true,
          allowedTargets: [userId]
        };
      }

      // 拒绝：不能查询其他用户
      return {
        allowed: false,
        reason: `您无权查询用户 "${targetUser}" 的信息。您只能查询自己的数据。`,
        allowedTargets: [userId, ...ownedBots]
      };
    }

    // 4. 检查 targetBot
    if (targetBot) {
      // 检查是否是自己拥有的 Bot
      if (ownedBots.includes(targetBot)) {
        return {
          allowed: true,
          allowedTargets: [targetBot]
        };
      }

      // 拒绝：不能查询他人的 Bot
      return {
        allowed: false,
        reason: `您无权查询 Bot "${targetBot}" 的信息。您只能查询自己拥有的 Bot：${ownedBots.join(', ') || '无'}。`,
        allowedTargets: [userId, ...ownedBots]
      };
    }

    // 默认允许
    return {
      allowed: true,
      allowedTargets: [userId, ...ownedBots]
    };
  }

  /**
   * 获取用户拥有的 Bot 列表
   */
  async getUserOwnedBots(userId: string): Promise<string[]> {
    try {
      const [rows] = await this.db.query<any[]>(
        'SELECT bot_id FROM user_bot_ownership WHERE user_id = ?',
        [userId]
      );

      return rows.map((row: any) => row.bot_id);
    } catch (error) {
      console.error(`[PermissionChecker] Failed to fetch owned bots for user ${userId}:`, error);
      // 如果查询失败，返回空数组（安全策略：默认无权限）
      return [];
    }
  }

  /**
   * 构建用户权限上下文
   */
  async buildContext(userId: string): Promise<UserPermissionContext> {
    const ownedBots = await this.getUserOwnedBots(userId);
    return { userId, ownedBots };
  }
}
