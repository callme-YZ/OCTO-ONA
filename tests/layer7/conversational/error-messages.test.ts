/**
 * Layer 7: Conversational ONA - Error Messages Tests
 */

import { ErrorMessages, ErrorType } from '../../../src/layer7/conversational/error-messages';
import { IntentType } from '../../../src/layer7/conversational/types';

describe('ErrorMessages', () => {
  // ============================================================================
  // 测试：权限拒绝消息
  // ============================================================================
  describe('Permission denied', () => {
    test('Case 1: Permission denied for user', () => {
      const message = ErrorMessages.getPermissionDeniedMessage('Alice');

      expect(message).toContain('无权查询');
      expect(message).toContain('Alice');
      expect(message).toContain('您可以查询');
      expect(message).toContain('您自己的数据');
    });

    test('Case 2: Permission denied for bot', () => {
      const message = ErrorMessages.getPermissionDeniedMessage(undefined, 'Bot1');

      expect(message).toContain('Bot1');
      expect(message).toContain('无权');
    });

    test('Case 3: Include allowed bot list', () => {
      const message = ErrorMessages.getPermissionDeniedMessage(
        'Alice',
        undefined,
        ['Bot1', 'Bot2']
      );

      expect(message).toContain('Bot1');
      expect(message).toContain('Bot2');
      expect(message).toContain('您拥有的 Bot');
    });

    test('Case 4: Suggest alternative queries', () => {
      const message = ErrorMessages.getPermissionDeniedMessage('Alice');

      expect(message).toContain('试试这些问题');
      expect(message).toContain('我的 Hub Score');
    });
  });

  // ============================================================================
  // 测试：API 错误消息
  // ============================================================================
  describe('API error', () => {
    test('Case 5: General API error', () => {
      const message = ErrorMessages.getAPIErrorMessage();

      expect(message).toContain('系统暂时无法处理');
      expect(message).toContain('可能的原因');
      expect(message).toContain('稍后重试');
    });

    test('Case 6: API error for trend analysis', () => {
      const message = ErrorMessages.getAPIErrorMessage(IntentType.TREND_ANALYSIS);

      expect(message).toContain('更短的时间跨度');
    });

    test('Case 7: API error for ranking query', () => {
      const message = ErrorMessages.getAPIErrorMessage(IntentType.RANKING_QUERY);

      expect(message).toContain('减少排名数量');
    });
  });

  // ============================================================================
  // 测试：数据不足消息
  // ============================================================================
  describe('Data not found', () => {
    test('Case 8: Data not found for metrics', () => {
      const message = ErrorMessages.getDataNotFoundMessage(
        IntentType.METRICS_QUERY,
        'Alice'
      );

      expect(message).toContain('没有找到');
      expect(message).toContain('Alice');
      expect(message).toContain('活动记录');
    });

    test('Case 9: Data not found for network', () => {
      const message = ErrorMessages.getDataNotFoundMessage(
        IntentType.NETWORK_QUERY,
        'Bob'
      );

      expect(message).toContain('协作记录');
    });

    test('Case 10: Data not found for trend', () => {
      const message = ErrorMessages.getDataNotFoundMessage(
        IntentType.TREND_ANALYSIS,
        'Charlie'
      );

      expect(message).toContain('至少 3 个数据点');
      expect(message).toContain('扩大时间范围');
    });

    test('Case 11: Suggest alternatives', () => {
      const message = ErrorMessages.getDataNotFoundMessage(
        IntentType.METRICS_QUERY,
        'Alice'
      );

      expect(message).toContain('试试这些');
    });
  });

  // ============================================================================
  // 测试：解析错误消息
  // ============================================================================
  describe('Parse error', () => {
    test('Case 12: Parse error message', () => {
      const message = ErrorMessages.getParseErrorMessage('random text');

      expect(message).toContain('没太理解');
      expect(message).toContain('我可以帮您');
      expect(message).toContain('/help');
    });

    test('Case 13: Include example queries', () => {
      const message = ErrorMessages.getParseErrorMessage('???');

      expect(message).toContain('我的 Hub Score');
      expect(message).toContain('本周的活跃度');
    });
  });

  // ============================================================================
  // 测试：内部错误消息
  // ============================================================================
  describe('Internal error', () => {
    test('Case 14: Internal error message', () => {
      const message = ErrorMessages.getInternalErrorMessage();

      expect(message).toContain('意外错误');
      expect(message).toContain('不是您的问题');
      expect(message).toContain('稍后重试');
    });
  });

  // ============================================================================
  // 测试：统一错误消息接口
  // ============================================================================
  describe('Unified getMessage', () => {
    test('Case 15: Get permission denied message', () => {
      const message = ErrorMessages.getMessage(ErrorType.PERMISSION_DENIED, {
        targetUser: 'Alice'
      });

      expect(message).toContain('无权查询');
      expect(message).toContain('Alice');
    });

    test('Case 16: Get API error message', () => {
      const message = ErrorMessages.getMessage(ErrorType.API_ERROR, {
        intentType: IntentType.METRICS_QUERY
      });

      expect(message).toContain('系统暂时无法处理');
    });

    test('Case 17: Get data not found message', () => {
      const message = ErrorMessages.getMessage(ErrorType.DATA_NOT_FOUND, {
        intentType: IntentType.NETWORK_QUERY,
        targetUser: 'Bob'
      });

      expect(message).toContain('没有找到');
    });

    test('Case 18: Get parse error message', () => {
      const message = ErrorMessages.getMessage(ErrorType.PARSE_ERROR, {
        query: 'random'
      });

      expect(message).toContain('没太理解');
    });

    test('Case 19: Get internal error message', () => {
      const message = ErrorMessages.getMessage(ErrorType.INTERNAL_ERROR);

      expect(message).toContain('意外错误');
    });
  });

  // ============================================================================
  // 测试：建议问题
  // ============================================================================
  describe('Suggested queries', () => {
    test('Case 20: Suggest alternatives for failed metrics query', () => {
      const suggestions = ErrorMessages.getSuggestedQueries(
        IntentType.METRICS_QUERY,
        true
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('Hub Score'))).toBe(true);
    });

    test('Case 21: Suggest alternatives for failed network query', () => {
      const suggestions = ErrorMessages.getSuggestedQueries(
        IntentType.NETWORK_QUERY,
        true
      );

      expect(suggestions.some(s => s.includes('联系'))).toBe(true);
    });

    test('Case 22: Suggest next steps for successful query', () => {
      const suggestions = ErrorMessages.getSuggestedQueries(
        IntentType.METRICS_QUERY,
        false
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('趋势') || s.includes('报告'))).toBe(true);
    });
  });
});
