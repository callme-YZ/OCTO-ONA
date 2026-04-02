/**
 * Layer 7: Conversational ONA - Intent Parser
 * 
 * 基于规则的意图解析器
 */

import * as yaml from 'yaml';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IIntentParser } from './interfaces';
import { ParsedIntent, IntentType, IntentParams, IntentRule } from './types';

interface RuleConfig {
  intents: Array<{
    type: string;
    priority: number;
    keywords: string[];
    patterns: string[];
    examples?: string[];
  }>;
  parameters: {
    time_range?: Array<{ pattern: string; preset?: string; days?: string }>;
    target?: Array<{ pattern: string; value: string }>;
    limit?: Array<{ pattern: string; value: string }>;
    metric_type?: Array<{ pattern: string; value: string }>;
    report_format?: Array<{ pattern: string; value: string }>;
  };
}

/**
 * 意图解析器实现
 */
export class IntentParser implements IIntentParser {
  private rules: IntentRule[] = [];
  private paramRules: RuleConfig['parameters'] = {};

  /**
   * 加载规则配置
   */
  async loadRules(rulesPath: string): Promise<void> {
    try {
      const content = await fs.readFile(rulesPath, 'utf-8');
      const config: RuleConfig = yaml.parse(content);

      // 转换规则格式
      this.rules = config.intents.map(rule => ({
        type: rule.type as IntentType,
        keywords: rule.keywords,
        patterns: rule.patterns,
        priority: rule.priority
      }));

      this.paramRules = config.parameters;

      console.log(`[IntentParser] Loaded ${this.rules.length} intent rules`);
    } catch (error) {
      throw new Error(`Failed to load rules from ${rulesPath}: ${error}`);
    }
  }

  /**
   * 解析自然语言查询
   */
  async parse(query: string): Promise<ParsedIntent> {
    if (!this.rules.length) {
      throw new Error('Rules not loaded. Call loadRules() first.');
    }

    // 1. 意图识别
    const { type, confidence } = this.detectIntent(query);

    // 2. 参数提取
    const params = this.extractParams(query, type);

    return {
      type,
      confidence,
      params,
      rawQuery: query
    };
  }

  /**
   * 检测意图类型
   */
  private detectIntent(query: string): { type: IntentType; confidence: number } {
    let bestMatch: { type: IntentType; score: number; priority: number } | null = null;

    for (const rule of this.rules) {
      let score = 0;

      // 关键词匹配（每个关键词 +0.3）
      for (const keyword of rule.keywords) {
        if (query.includes(keyword)) {
          score += 0.3;
        }
      }

      // 正则模式匹配（每个模式 +0.5）
      for (const pattern of rule.patterns) {
        try {
          const regex = new RegExp(pattern);
          if (regex.test(query)) {
            score += 0.5;
          }
        } catch (err) {
          console.warn(`[IntentParser] Invalid pattern: ${pattern}`);
        }
      }

      // 选择得分最高的（优先级作为 tie-breaker）
      if (score > 0) {
        if (!bestMatch || score > bestMatch.score || 
            (score === bestMatch.score && rule.priority > bestMatch.priority)) {
          bestMatch = { type: rule.type, score, priority: rule.priority };
        }
      }
    }

    if (!bestMatch) {
      // 无法识别，默认为 METRICS_QUERY（最常见）
      return { type: IntentType.METRICS_QUERY, confidence: 0.3 };
    }

    // 归一化置信度（score 上限约为 1.5）
    const confidence = Math.min(bestMatch.score / 1.5, 1.0);

    return { type: bestMatch.type, confidence };
  }

  /**
   * 提取参数
   */
  private extractParams(query: string, intentType: IntentType): IntentParams {
    const params: IntentParams = {};

    // 时间范围
    const timeRange = this.extractTimeRange(query);
    if (timeRange) {
      params.timeRange = timeRange;
    }

    // 目标对象
    const target = this.extractTarget(query);
    if (target) {
      if (target === 'self') {
        params.targetUser = 'self';
      } else if (target.startsWith('Bot')) {
        params.targetBot = target;
      } else {
        params.targetUser = target;
      }
    }

    // Top N
    const limit = this.extractLimit(query);
    if (limit) {
      params.limit = limit;
    }

    // 指标类型
    const metricType = this.extractMetricType(query);
    if (metricType) {
      params.metricType = metricType;
    }

    // 报告格式
    const reportFormat = this.extractReportFormat(query);
    if (reportFormat) {
      params.reportFormat = reportFormat;
    }

    return params;
  }

  /**
   * 提取时间范围
   */
  private extractTimeRange(query: string): IntentParams['timeRange'] | null {
    const rules = this.paramRules.time_range || [];

    for (const rule of rules) {
      const regex = new RegExp(rule.pattern);
      const match = query.match(regex);

      if (match) {
        if (rule.preset) {
          return { preset: rule.preset as any };
        }
        if (rule.days) {
          const days = parseInt(rule.days.replace('$1', match[1]));
          const end = new Date();
          const start = new Date();
          start.setDate(start.getDate() - days);
          return { start, end };
        }
      }
    }

    return null;
  }

  /**
   * 提取目标对象
   */
  private extractTarget(query: string): string | null {
    const rules = this.paramRules.target || [];

    for (const rule of rules) {
      const regex = new RegExp(rule.pattern);
      const match = query.match(regex);

      if (match) {
        let value = rule.value;
        // 替换占位符
        value = value.replace('$0', match[0]);
        value = value.replace('$1', match[1] || '');
        return value;
      }
    }

    return null;
  }

  /**
   * 提取 Top N
   */
  private extractLimit(query: string): number | null {
    const rules = this.paramRules.limit || [];

    for (const rule of rules) {
      const regex = new RegExp(rule.pattern);
      const match = query.match(regex);

      if (match) {
        let value = rule.value;
        value = value.replace('$1', match[1] || '');
        value = value.replace('$2', match[2] || '');
        return parseInt(value);
      }
    }

    return null;
  }

  /**
   * 提取指标类型
   */
  private extractMetricType(query: string): string | null {
    const rules = this.paramRules.metric_type || [];

    for (const rule of rules) {
      const regex = new RegExp(rule.pattern);
      if (regex.test(query)) {
        return rule.value;
      }
    }

    return null;
  }

  /**
   * 提取报告格式
   */
  private extractReportFormat(query: string): 'html' | 'pdf' | null {
    const rules = this.paramRules.report_format || [];

    for (const rule of rules) {
      const regex = new RegExp(rule.pattern);
      if (regex.test(query)) {
        return rule.value as 'html' | 'pdf';
      }
    }

    return null;
  }
}
