/**
 * Layer 7: Conversational ONA - Context Manager Tests
 */

import { ContextManager } from '../../../src/layer7/conversational/context-manager';
import { ParsedIntent, IntentType } from '../../../src/layer7/conversational/types';

describe('ContextManager', () => {
  let manager: ContextManager;

  beforeEach(() => {
    manager = new ContextManager({ maxHistoryTurns: 5 });
  });

  // ============================================================================
  // 测试：对话历史维护
  // ============================================================================
  describe('Conversation history', () => {
    test('Case 1: Add single turn', () => {
      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: {},
        rawQuery: '我的 Hub Score'
      };

      manager.addTurn('user123', '我的 Hub Score', intent, 'Your score is 2.5');

      const context = manager.getContext('user123');
      expect(context.history.length).toBe(1);
      expect(context.history[0].query).toBe('我的 Hub Score');
      expect(context.history[0].response).toBe('Your score is 2.5');
    });

    test('Case 2: Maintain max 5 turns', () => {
      for (let i = 1; i <= 10; i++) {
        const intent: ParsedIntent = {
          type: IntentType.METRICS_QUERY,
          confidence: 0.9,
          params: {},
          rawQuery: `Query ${i}`
        };
        manager.addTurn('user123', `Query ${i}`, intent);
      }

      const context = manager.getContext('user123');
      expect(context.history.length).toBe(5);
      expect(context.history[0].query).toBe('Query 6');
      expect(context.history[4].query).toBe('Query 10');
    });

    test('Case 3: Separate contexts for different users', () => {
      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: {},
        rawQuery: 'Test'
      };

      manager.addTurn('user1', 'Query A', intent);
      manager.addTurn('user2', 'Query B', intent);

      expect(manager.getContext('user1').history.length).toBe(1);
      expect(manager.getContext('user2').history.length).toBe(1);
      expect(manager.getContext('user1').history[0].query).toBe('Query A');
      expect(manager.getContext('user2').history[0].query).toBe('Query B');
    });
  });

  // ============================================================================
  // 测试：代词消解
  // ============================================================================
  describe('Pronoun resolution', () => {
    test('Case 4: Resolve "他" to last mentioned user', () => {
      const intent1: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetUser: 'Alice' },
        rawQuery: 'Alice 的 Hub Score'
      };
      manager.addTurn('user123', 'Alice 的 Hub Score', intent1);

      const intent2: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.85,
        params: {},
        rawQuery: '他的活跃度如何？'
      };

      const resolved = manager.resolvePronouns('user123', intent2);
      expect(resolved.params.targetUser).toBe('Alice');
    });

    test('Case 5: Resolve to last mentioned bot', () => {
      const intent1: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetBot: 'Bot1' },
        rawQuery: 'Bot1 的数据'
      };
      manager.addTurn('user123', 'Bot1 的数据', intent1);

      const intent2: ParsedIntent = {
        type: IntentType.NETWORK_QUERY,
        confidence: 0.85,
        params: {},
        rawQuery: '它和谁有联系？'
      };

      const resolved = manager.resolvePronouns('user123', intent2);
      expect(resolved.params.targetBot).toBe('Bot1');
    });

    test('Case 6: Do not override explicit target', () => {
      const intent1: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetUser: 'Alice' },
        rawQuery: 'Alice 的数据'
      };
      manager.addTurn('user123', 'Alice 的数据', intent1);

      const intent2: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetUser: 'Bob' },
        rawQuery: 'Bob 的数据'
      };

      const resolved = manager.resolvePronouns('user123', intent2);
      expect(resolved.params.targetUser).toBe('Bob');
    });
  });

  // ============================================================================
  // 测试：时间推断
  // ============================================================================
  describe('Time range inference', () => {
    test('Case 7: Inherit time range from previous turn', () => {
      const intent1: ParsedIntent = {
        type: IntentType.TREND_ANALYSIS,
        confidence: 0.9,
        params: {
          timeRange: { preset: 'this_week' }
        },
        rawQuery: '本周趋势'
      };
      // Must add turn to update context
      manager.addTurn('user123', '本周趋势', intent1);

      const intent2: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.85,
        params: {},
        rawQuery: '我的活跃度'
      };

      const inferred = manager.inferTimeRange('user123', intent2);
      expect(inferred.params.timeRange?.preset).toBe('this_week');
    });

    test('Case 8: Update context when new time range provided', () => {
      const intent1: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: {
          timeRange: { preset: 'this_week' }
        },
        rawQuery: '本周数据'
      };
      manager.addTurn('user123', '本周数据', intent1);

      const intent2: ParsedIntent = {
        type: IntentType.TREND_ANALYSIS,
        confidence: 0.9,
        params: {
          timeRange: { preset: 'last_month' }
        },
        rawQuery: '上月趋势'
      };

      manager.inferTimeRange('user123', intent2);
      manager.addTurn('user123', '上月趋势', intent2);

      const intent3: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.85,
        params: {},
        rawQuery: '活跃度'
      };

      const inferred2 = manager.inferTimeRange('user123', intent3);
      expect(inferred2.params.timeRange?.preset).toBe('last_month');
    });

    test('Case 9: Do not inherit for non-time-sensitive queries', () => {
      const intent1: ParsedIntent = {
        type: IntentType.TREND_ANALYSIS,
        confidence: 0.9,
        params: {
          timeRange: { preset: 'this_week' }
        },
        rawQuery: '本周趋势'
      };
      manager.addTurn('user123', '本周趋势', intent1);

      const intent2: ParsedIntent = {
        type: IntentType.NETWORK_QUERY,
        confidence: 0.85,
        params: {},
        rawQuery: '我和谁有联系'
      };

      const inferred = manager.inferTimeRange('user123', intent2);
      expect(inferred.params.timeRange).toBeUndefined();
    });
  });

  // ============================================================================
  // 测试：完整上下文增强
  // ============================================================================
  describe('Full context enhancement', () => {
    test('Case 10: Pronoun + time inference together', () => {
      const intent1: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: {
          targetUser: 'Alice',
          timeRange: { preset: 'this_week' }
        },
        rawQuery: 'Alice 本周的数据'
      };
      manager.addTurn('user123', 'Alice 本周的数据', intent1);

      const intent2: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.85,
        params: {},
        rawQuery: '他的活跃度'
      };

      const enhanced = manager.enhanceWithContext('user123', intent2);
      expect(enhanced.params.targetUser).toBe('Alice');
      expect(enhanced.params.timeRange?.preset).toBe('this_week');
    });
  });

  // ============================================================================
  // 测试：历史摘要
  // ============================================================================
  describe('History summary', () => {
    test('Case 11: Generate summary for debugging', () => {
      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: {},
        rawQuery: 'Test'
      };

      manager.addTurn('user123', 'Query 1', intent);
      manager.addTurn('user123', 'Query 2', intent);

      const summary = manager.getHistorySummary('user123');
      expect(summary).toContain('Query 1');
      expect(summary).toContain('Query 2');
      expect(summary).toContain('metrics_query');
    });

    test('Case 12: Empty history', () => {
      const summary = manager.getHistorySummary('new_user');
      expect(summary).toBe('暂无对话历史');
    });
  });

  // ============================================================================
  // 测试：清除上下文
  // ============================================================================
  describe('Clear context', () => {
    test('Case 13: Clear user context', () => {
      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: {},
        rawQuery: 'Test'
      };

      manager.addTurn('user123', 'Test', intent);
      expect(manager.getContext('user123').history.length).toBe(1);

      manager.clearContext('user123');
      expect(manager.getContext('user123').history.length).toBe(0);
    });
  });
});
