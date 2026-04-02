/**
 * Layer 7: Conversational ONA - Response Generator Tests
 * 
 * 单元测试：响应生成增强功能
 */

import { ResponseGenerator } from '../../../src/layer7/conversational/response-generator';
import { ParsedIntent, IntentType } from '../../../src/layer7/conversational/types';

describe('ResponseGenerator', () => {
  let generator: ResponseGenerator;

  beforeEach(() => {
    generator = new ResponseGenerator();
  });

  // ============================================================================
  // 测试：数字→自然语言描述
  // ============================================================================
  describe('Number to natural language', () => {
    test('Case 1: Hub Score with description', async () => {
      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: { targetUser: 'self' },
        rawQuery: '我的 Hub Score'
      };

      const data = { hub_score: 2.5 };
      const summary = await generator.generateTextSummary(intent, data);

      expect(summary).toContain('2.50');
      expect(summary).toContain('L3');
      expect(summary).toContain('协作接口');
    });

    test('Case 2: Connection count description', async () => {
      const intent: ParsedIntent = {
        type: IntentType.NETWORK_QUERY,
        confidence: 0.8,
        params: {},
        rawQuery: '我和谁有联系'
      };

      const data = { connections: [{ id: '1' }, { id: '2' }] };
      const summary = await generator.generateTextSummary(intent, data);

      expect(summary).toMatch(/2/);
      expect(summary).toContain('联系人');
    });
  });

  // ============================================================================
  // 测试：趋势描述（+8% ↗️）
  // ============================================================================
  describe('Trend description', () => {
    test('Case 3: Upward trend with percentage', async () => {
      const intent: ParsedIntent = {
        type: IntentType.TREND_ANALYSIS,
        confidence: 0.85,
        params: { timeRange: { preset: 'this_week' } },
        rawQuery: '这周的趋势'
      };

      const data = {
        trend: [
          { date: '2026-03-01', value: 100 },
          { date: '2026-03-08', value: 108 }
        ]
      };

      const summary = await generator.generateTextSummary(intent, data);

      expect(summary).toMatch(/上升.*8\.0%/);
      expect(summary).toContain('↗️');
    });

    test('Case 4: Downward trend', async () => {
      const intent: ParsedIntent = {
        type: IntentType.TREND_ANALYSIS,
        confidence: 0.85,
        params: {},
        rawQuery: '趋势如何'
      };

      const data = {
        trend: [
          { date: '2026-03-01', value: 100 },
          { date: '2026-03-08', value: 85 }
        ]
      };

      const summary = await generator.generateTextSummary(intent, data);

      expect(summary).toMatch(/下降.*15\.0%/);
      expect(summary).toContain('↘️');
    });

    test('Case 5: Stable trend', async () => {
      const intent: ParsedIntent = {
        type: IntentType.TREND_ANALYSIS,
        confidence: 0.85,
        params: {},
        rawQuery: '趋势'
      };

      const data = {
        trend: [
          { date: '2026-03-01', value: 100 },
          { date: '2026-03-08', value: 102 }
        ]
      };

      const summary = await generator.generateTextSummary(intent, data);

      expect(summary).toContain('稳定');
      expect(summary).toContain('→');
    });
  });

  // ============================================================================
  // 测试：建议生成
  // ============================================================================
  describe('Suggestions', () => {
    test('Case 6: Low Hub Score → suggestion', async () => {
      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: {},
        rawQuery: '我的指标'
      };

      const data = { hub_score: 0.1 };
      const summary = await generator.generateTextSummary(intent, data);

      expect(summary).toContain('建议');
      expect(summary).toMatch(/主动回复|分享|参与/);
    });

    test('Case 7: High Hub Score → encouragement', async () => {
      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: {},
        rawQuery: '我的指标'
      };

      const data = { hub_score: 4.5 };
      const summary = await generator.generateTextSummary(intent, data);

      expect(summary).toContain('建议');
      expect(summary).toMatch(/影响力|继续保持/);
    });

    test('Case 8: Small network → suggestion', async () => {
      const intent: ParsedIntent = {
        type: IntentType.NETWORK_QUERY,
        confidence: 0.8,
        params: {},
        rawQuery: '我的网络'
      };

      const data = { connections: [{ id: '1' }] };
      const summary = await generator.generateTextSummary(intent, data);

      expect(summary).toContain('建议');
      expect(summary).toMatch(/主动联系|参与|分享/);
    });
  });

  // ============================================================================
  // 测试：上下文附加（数据时效）
  // ============================================================================
  describe('Context information', () => {
    test('Case 9: Time range context', async () => {
      const intent: ParsedIntent = {
        type: IntentType.TREND_ANALYSIS,
        confidence: 0.85,
        params: { timeRange: { preset: 'this_week' } },
        rawQuery: '本周趋势'
      };

      const data = { trend: [] };
      const summary = await generator.generateTextSummary(intent, data);

      expect(summary).toContain('本周');
    });

    test('Case 10: Default data freshness', async () => {
      const intent: ParsedIntent = {
        type: IntentType.METRICS_QUERY,
        confidence: 0.9,
        params: {},
        rawQuery: '我的指标'
      };

      const data = { hub_score: 2.5 };
      const summary = await generator.generateTextSummary(intent, data);

      expect(summary).toContain('实时');
    });
  });

  // ============================================================================
  // 测试：HTML 报告增强
  // ============================================================================
  describe('HTML Report', () => {
    test('Case 11: Enhanced HTML with styles', async () => {
      const intent: ParsedIntent = {
        type: IntentType.REPORT_GENERATION,
        confidence: 0.9,
        params: {},
        rawQuery: '生成报告'
      };

      const data = { hub_score: 2.5, message_count: 100 };
      const html = await generator.generateHTMLReport(intent, data);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<style>');
      expect(html).toContain('组织网络分析报告');
      expect(html).toContain(intent.rawQuery);
      expect(html).toContain('生成时间');
    });
  });

  // ============================================================================
  // 测试：Ranking with medals
  // ============================================================================
  describe('Ranking display', () => {
    test('Case 12: Top 3 with medals', async () => {
      const intent: ParsedIntent = {
        type: IntentType.RANKING_QUERY,
        confidence: 0.9,
        params: { limit: 5 },
        rawQuery: 'Top 5'
      };

      const data = {
        ranking: [
          { name: 'Alice', score: 5.0 },
          { name: 'Bob', score: 4.0 },
          { name: 'Charlie', score: 3.0 },
          { name: 'David', score: 2.0 },
          { name: 'Eve', score: 1.0 }
        ]
      };

      const summary = await generator.generateTextSummary(intent, data);

      expect(summary).toContain('🥇');
      expect(summary).toContain('🥈');
      expect(summary).toContain('🥉');
      expect(summary).toContain('🏆');
    });
  });
});
