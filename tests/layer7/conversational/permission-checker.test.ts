/**
 * Layer 7: Conversational ONA - Permission Checker Tests
 * 
 * 单元测试：权限检查逻辑
 */

import { PermissionChecker } from '../../../src/layer7/conversational/permission-checker';
import { ParsedIntent, IntentType, UserPermissionContext } from '../../../src/layer7/conversational/types';
import { Pool } from 'mysql2/promise';

// Mock MySQL Pool
const createMockPool = (ownedBots: string[]): Pool => {
  return {
    query: jest.fn().mockResolvedValue([
      ownedBots.map(bot_id => ({ bot_id }))
    ])
  } as any;
};

describe('PermissionChecker', () => {
  let checker: PermissionChecker;
  const mockPool = createMockPool(['Bot1', 'Bot2', 'Bot3']);

  beforeEach(() => {
    checker = new PermissionChecker({ db: mockPool });
  });

  // ============================================================================
  // 测试：查询自己（允许）
  // ============================================================================
  describe('Query self (allowed)', () => {
    test('Case 1: targetUser = "self"', async () => {
      const userContext: UserPermissionContext = {
        userId: 'user123',
        ownedBots: ['Bot1', 'Bot2']
      };

      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetUser: 'self' },
        rawQuery: '我的 Hub Score 是多少？'
      };

      const result = await checker.check(userContext, intent);
      expect(result.allowed).toBe(true);
      expect(result.allowedTargets).toContain('user123');
    });

    test('Case 2: targetUser = userId', async () => {
      const userContext: UserPermissionContext = {
        userId: 'user123',
        ownedBots: ['Bot1']
      };

      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetUser: 'user123' },
        rawQuery: 'user123 的 Hub Score'
      };

      const result = await checker.check(userContext, intent);
      expect(result.allowed).toBe(true);
    });

    test('Case 3: No target specified (default to self)', async () => {
      const userContext: UserPermissionContext = {
        userId: 'user123',
        ownedBots: []
      };

      const intent: ParsedIntent = {
        type: IntentType.NETWORK_QUERY,
        confidence: 0.8,
        params: {},
        rawQuery: '我和谁有联系？'
      };

      const result = await checker.check(userContext, intent);
      expect(result.allowed).toBe(true);
    });
  });

  // ============================================================================
  // 测试：查询自己的 Bot（允许）
  // ============================================================================
  describe('Query owned bots (allowed)', () => {
    test('Case 4: targetBot in ownedBots', async () => {
      const userContext: UserPermissionContext = {
        userId: 'user123',
        ownedBots: ['Bot1', 'Bot2']
      };

      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetBot: 'Bot1' },
        rawQuery: 'Bot1 的活跃度'
      };

      const result = await checker.check(userContext, intent);
      expect(result.allowed).toBe(true);
      expect(result.allowedTargets).toContain('Bot1');
    });

    test('Case 5: Multiple owned bots', async () => {
      const userContext: UserPermissionContext = {
        userId: 'user123',
        ownedBots: ['BotA', 'BotB', 'BotC']
      };

      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetBot: 'BotC' },
        rawQuery: 'BotC 的指标'
      };

      const result = await checker.check(userContext, intent);
      expect(result.allowed).toBe(true);
    });
  });

  // ============================================================================
  // 测试：查询其他用户（拒绝）
  // ============================================================================
  describe('Query other users (denied)', () => {
    test('Case 6: targetUser = other user', async () => {
      const userContext: UserPermissionContext = {
        userId: 'user123',
        ownedBots: []
      };

      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetUser: 'otherUser' },
        rawQuery: 'otherUser 的 Hub Score'
      };

      const result = await checker.check(userContext, intent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('您无权查询用户 "otherUser"');
      expect(result.reason).toContain('您只能查询自己的数据');
    });

    test('Case 7: Friendly error message', async () => {
      const userContext: UserPermissionContext = {
        userId: 'alice',
        ownedBots: ['BotX']
      };

      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetUser: 'bob' },
        rawQuery: 'bob 的活跃度'
      };

      const result = await checker.check(userContext, intent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeTruthy();
      expect(result.allowedTargets).toContain('alice');
      expect(result.allowedTargets).toContain('BotX');
    });
  });

  // ============================================================================
  // 测试：查询他人的 Bot（拒绝）
  // ============================================================================
  describe('Query other bots (denied)', () => {
    test('Case 8: targetBot not in ownedBots', async () => {
      const userContext: UserPermissionContext = {
        userId: 'user123',
        ownedBots: ['Bot1', 'Bot2']
      };

      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetBot: 'Bot999' },
        rawQuery: 'Bot999 的指标'
      };

      const result = await checker.check(userContext, intent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('您无权查询 Bot "Bot999"');
      expect(result.reason).toContain('Bot1, Bot2');
    });

    test('Case 9: User has no bots', async () => {
      const userContext: UserPermissionContext = {
        userId: 'user456',
        ownedBots: []
      };

      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetBot: 'BotX' },
        rawQuery: 'BotX 的活跃度'
      };

      const result = await checker.check(userContext, intent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('无');
    });
  });

  // ============================================================================
  // 测试：getUserOwnedBots
  // ============================================================================
  describe('getUserOwnedBots', () => {
    test('Case 10: Fetch owned bots from DB', async () => {
      const bots = await checker.getUserOwnedBots('user123');
      expect(bots).toEqual(['Bot1', 'Bot2', 'Bot3']);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT bot_id FROM user_bot_ownership WHERE user_id = ?',
        ['user123']
      );
    });

    test('Case 11: DB query fails (return empty array)', async () => {
      const failPool = {
        query: jest.fn().mockRejectedValue(new Error('DB error'))
      } as any;

      const failChecker = new PermissionChecker({ db: failPool });
      const bots = await failChecker.getUserOwnedBots('user123');
      expect(bots).toEqual([]);
    });
  });

  // ============================================================================
  // 测试：buildContext
  // ============================================================================
  describe('buildContext', () => {
    test('Case 12: Build user permission context', async () => {
      const context = await checker.buildContext('user123');
      expect(context.userId).toBe('user123');
      expect(context.ownedBots).toEqual(['Bot1', 'Bot2', 'Bot3']);
    });
  });

  // ============================================================================
  // 边界测试
  // ============================================================================
  describe('Edge cases', () => {
    test('Case 13: Empty ownedBots list', async () => {
      const userContext: UserPermissionContext = {
        userId: 'user999',
        ownedBots: []
      };

      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetUser: 'self' },
        rawQuery: '我的数据'
      };

      const result = await checker.check(userContext, intent);
      expect(result.allowed).toBe(true);
    });

    test('Case 14: Both targetUser and targetBot specified (targetUser takes precedence)', async () => {
      const userContext: UserPermissionContext = {
        userId: 'user123',
        ownedBots: ['Bot1']
      };

      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetUser: 'otherUser', targetBot: 'Bot1' },
        rawQuery: 'otherUser 和 Bot1'
      };

      const result = await checker.check(userContext, intent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('otherUser');
    });
  });
});
