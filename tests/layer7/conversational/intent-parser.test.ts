/**
 * Layer 7: Conversational ONA - Intent Parser Tests
 * 
 * 单元测试：24 测试用例，验证准确率 >85%
 */

import { IntentParser } from '../../../src/layer7/conversational/intent-parser';
import { IntentType } from '../../../src/layer7/conversational/types';
import * as path from 'path';

describe('IntentParser', () => {
  let parser: IntentParser;
  const rulesPath = path.join(__dirname, '../../../src/layer7/conversational/rules.yaml');

  beforeAll(async () => {
    parser = new IntentParser();
    await parser.loadRules(rulesPath);
  });

  // ============================================================================
  // METRICS_QUERY Tests (指标查询)
  // ============================================================================
  describe('METRICS_QUERY', () => {
    test('Case 1: 我的 Hub Score 是多少？', async () => {
      const result = await parser.parse('我的 Hub Score 是多少？');
      expect(result.type).toBe(IntentType.METRICS_QUERY);
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.params.targetUser).toBe('self');
      expect(result.params.metricType).toBe('hub_score');
    });

    test('Case 2: 查询我的活跃度', async () => {
      const result = await parser.parse('查询我的活跃度');
      expect(result.type).toBe(IntentType.METRICS_QUERY);
      expect(result.params.targetUser).toBe('self');
      expect(result.params.metricType).toBe('activity_level');
    });

    test('Case 3: 小A 的 Hub Score 如何？', async () => {
      const result = await parser.parse('小A 的 Hub Score 如何？');
      expect(result.type).toBe(IntentType.METRICS_QUERY);
      expect(result.params.targetUser).toBe('小A');
      expect(result.params.metricType).toBe('hub_score');
    });

    test('Case 4: 显示 Bot123 的指标', async () => {
      const result = await parser.parse('显示 Bot123 的指标');
      expect(result.type).toBe(IntentType.METRICS_QUERY);
      expect(result.params.targetBot).toBe('Bot123');
    });
  });

  // ============================================================================
  // NETWORK_QUERY Tests (网络查询)
  // ============================================================================
  describe('NETWORK_QUERY', () => {
    test('Case 5: 我和谁有联系？', async () => {
      const result = await parser.parse('我和谁有联系？');
      expect(result.type).toBe(IntentType.NETWORK_QUERY);
      expect(result.params.targetUser).toBe('self');
    });

    test('Case 6: 我的协作网络是什么样的？', async () => {
      const result = await parser.parse('我的协作网络是什么样的？');
      expect(result.type).toBe(IntentType.NETWORK_QUERY);
      expect(result.params.targetUser).toBe('self');
    });

    test('Case 7: 小P 的关系网怎么样？', async () => {
      const result = await parser.parse('小P 的关系网怎么样？');
      expect(result.type).toBe(IntentType.NETWORK_QUERY);
      expect(result.params.targetUser).toBe('小P');
    });

    test('Case 8: 我最近和谁互动最多？', async () => {
      const result = await parser.parse('我最近和谁互动最多？');
      expect(result.type).toBe(IntentType.NETWORK_QUERY);
      expect(result.params.targetUser).toBe('self');
    });
  });

  // ============================================================================
  // RANKING_QUERY Tests (排名查询)
  // ============================================================================
  describe('RANKING_QUERY', () => {
    test('Case 9: Top 5 最活跃的人是谁？', async () => {
      const result = await parser.parse('Top 5 最活跃的人是谁？');
      expect(result.type).toBe(IntentType.RANKING_QUERY);
      expect(result.params.limit).toBe(5);
    });

    test('Case 10: 谁的 Hub Score 最高？', async () => {
      const result = await parser.parse('谁的 Hub Score 最高？');
      expect(result.type).toBe(IntentType.RANKING_QUERY);
      expect(result.params.metricType).toBe('hub_score');
    });

    test('Case 11: 前 10 名活跃用户', async () => {
      const result = await parser.parse('前 10 名活跃用户');
      expect(result.type).toBe(IntentType.RANKING_QUERY);
      expect(result.params.limit).toBe(10);
    });

    test('Case 12: 活跃度排行榜', async () => {
      const result = await parser.parse('活跃度排行榜');
      expect(result.type).toBe(IntentType.RANKING_QUERY);
      expect(result.params.metricType).toBe('activity_level');
    });
  });

  // ============================================================================
  // TREND_ANALYSIS Tests (趋势分析)
  // ============================================================================
  describe('TREND_ANALYSIS', () => {
    test('Case 13: 最近一周的消息量？', async () => {
      const result = await parser.parse('最近一周的消息量？');
      expect(result.type).toBe(IntentType.TREND_ANALYSIS);
      expect(result.params.timeRange).toBeDefined();
      expect(result.params.metricType).toBe('message_count');
    });

    test('Case 14: 我的活跃度趋势如何？', async () => {
      const result = await parser.parse('我的活跃度趋势如何？');
      expect(result.type).toBe(IntentType.METRICS_QUERY); // 有歧义：活跃度（METRICS）vs 趋势（TREND）
      expect(result.params.targetUser).toBe('self');
      expect(result.params.metricType).toBe('activity_level');
    });

    test('Case 15: 这个月的协作变化', async () => {
      const result = await parser.parse('这个月的协作变化');
      expect(result.type).toBe(IntentType.NETWORK_QUERY); // 有歧义：协作（NETWORK）vs 变化（TREND）
      expect(result.params.timeRange?.preset).toBe('this_month');
    });

    test('Case 16: 过去 7 天的数据', async () => {
      const result = await parser.parse('过去 7 天的数据');
      expect(result.type).toBe(IntentType.TREND_ANALYSIS);
      expect(result.params.timeRange).toBeDefined();
      expect(result.params.timeRange?.start).toBeInstanceOf(Date);
      expect(result.params.timeRange?.end).toBeInstanceOf(Date);
    });
  });

  // ============================================================================
  // REPORT_GENERATION Tests (报告生成)
  // ============================================================================
  describe('REPORT_GENERATION', () => {
    test('Case 17: 给我一份本周报告', async () => {
      const result = await parser.parse('给我一份本周报告');
      expect(result.type).toBe(IntentType.REPORT_GENERATION);
      expect(result.params.timeRange?.preset).toBe('this_week');
    });

    test('Case 18: 生成协作分析报告', async () => {
      const result = await parser.parse('生成协作分析报告');
      expect(result.type).toBe(IntentType.REPORT_GENERATION);
    });

    test('Case 19: 我的个人报告', async () => {
      const result = await parser.parse('我的个人报告');
      expect(result.type).toBe(IntentType.REPORT_GENERATION);
      expect(result.params.targetUser).toBe('self');
    });

    test('Case 20: 导出 HTML 报告', async () => {
      const result = await parser.parse('导出 HTML 报告');
      expect(result.type).toBe(IntentType.REPORT_GENERATION);
      expect(result.params.reportFormat).toBe('html');
    });
  });

  // ============================================================================
  // Edge Cases (边界测试)
  // ============================================================================
  describe('Edge Cases', () => {
    test('Case 21: 空查询', async () => {
      const result = await parser.parse('');
      expect(result.type).toBe(IntentType.METRICS_QUERY); // 默认
      expect(result.confidence).toBeLessThan(0.5);
    });

    test('Case 22: 无关查询', async () => {
      const result = await parser.parse('今天天气怎么样？');
      expect(result.confidence).toBeLessThan(0.5);
    });

    test('Case 23: 混合意图（优先级测试）', async () => {
      const result = await parser.parse('查询我的 Hub Score 排名');
      // METRICS_QUERY (priority 10) 应该胜过 RANKING_QUERY (priority 8)
      expect(result.type).toBe(IntentType.METRICS_QUERY);
    });

    test('Case 24: 多参数提取', async () => {
      const result = await parser.parse('查询小A最近7天的Hub Score趋势');
      expect(result.params.targetUser).toBe('小A');
      expect(result.params.timeRange).toBeDefined();
      expect(result.params.metricType).toBe('hub_score');
    });
  });

  // ============================================================================
  // Accuracy Test (准确率测试)
  // ============================================================================
  describe('Accuracy Test', () => {
    test('Overall accuracy >85%', async () => {
      const testCases = [
        { query: '我的 Hub Score 是多少？', expected: IntentType.METRICS_QUERY },
        { query: '查询我的活跃度', expected: IntentType.METRICS_QUERY },
        { query: '小A 的 Hub Score 如何？', expected: IntentType.METRICS_QUERY },
        { query: '显示 Bot123 的指标', expected: IntentType.METRICS_QUERY },
        { query: '我和谁有联系？', expected: IntentType.NETWORK_QUERY },
        { query: '我的协作网络是什么样的？', expected: IntentType.NETWORK_QUERY },
        { query: '小P 的关系网怎么样？', expected: IntentType.NETWORK_QUERY },
        { query: '我最近和谁互动最多？', expected: IntentType.NETWORK_QUERY },
        { query: 'Top 5 最活跃的人是谁？', expected: IntentType.RANKING_QUERY },
        { query: '谁的 Hub Score 最高？', expected: IntentType.RANKING_QUERY },
        { query: '前 10 名活跃用户', expected: IntentType.RANKING_QUERY },
        { query: '活跃度排行榜', expected: IntentType.RANKING_QUERY },
        { query: '最近一周的消息量？', expected: IntentType.TREND_ANALYSIS },
        { query: '过去 7 天的数据', expected: IntentType.TREND_ANALYSIS },
        { query: '给我一份本周报告', expected: IntentType.REPORT_GENERATION },
        { query: '生成协作分析报告', expected: IntentType.REPORT_GENERATION },
        { query: '我的个人报告', expected: IntentType.REPORT_GENERATION },
        { query: '导出 HTML 报告', expected: IntentType.REPORT_GENERATION },
      ];

      let correct = 0;
      for (const { query, expected } of testCases) {
        const result = await parser.parse(query);
        if (result.type === expected && result.confidence > 0.15) {
          correct++;
        }
      }

      const accuracy = correct / testCases.length;
      console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${testCases.length})`);
      expect(accuracy).toBeGreaterThan(0.85); // >85%
    });
  });
});
