/**
 * Layer 7: Conversational ONA - Context Manager
 * 
 * 对话上下文管理：历史维护、代词消解、时间推断
 */

import { ParsedIntent, IntentType } from './types';

/**
 * 对话轮次
 */
export interface ConversationTurn {
  timestamp: Date;
  query: string;
  intent: ParsedIntent;
  response?: string;
}

/**
 * 对话上下文
 */
export interface ConversationContext {
  userId: string;
  history: ConversationTurn[];
  lastMentionedUser?: string;
  lastMentionedBot?: string;
  lastTimeRange?: {
    preset?: string;
    start?: Date;
    end?: Date;
  };
}

/**
 * 上下文管理器配置
 */
export interface ContextManagerConfig {
  maxHistoryTurns?: number; // 默认 5
}

/**
 * 上下文管理器
 */
export class ContextManager {
  private contexts: Map<string, ConversationContext> = new Map();
  private maxHistoryTurns: number;

  constructor(config: ContextManagerConfig = {}) {
    this.maxHistoryTurns = config.maxHistoryTurns || 5;
  }

  /**
   * 获取用户上下文（如果不存在则创建）
   */
  getContext(userId: string): ConversationContext {
    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, {
        userId,
        history: []
      });
    }
    return this.contexts.get(userId)!;
  }

  /**
   * 记录新的对话轮次
   */
  addTurn(
    userId: string,
    query: string,
    intent: ParsedIntent,
    response?: string
  ): void {
    const context = this.getContext(userId);

    // 添加新轮次
    context.history.push({
      timestamp: new Date(),
      query,
      intent,
      response
    });

    // 保持历史在 maxHistoryTurns 以内
    // 保持历史在 maxHistoryTurns 以内
    if (context.history.length > this.maxHistoryTurns) {
      context.history.shift();
    }

    // 更新上下文提及和时间范围
    this.updateContextMentions(context, intent);
    if (intent.params.timeRange) {
      context.lastTimeRange = intent.params.timeRange;
    }
  }

  /**
   * 代词消解（增强意图参数）
   */
  resolvePronouns(userId: string, intent: ParsedIntent): ParsedIntent {
    const context = this.getContext(userId);

    // 如果查询中有代词且没有明确目标，使用上下文
    if (!intent.params.targetUser && !intent.params.targetBot) {
      const pronouns = this.detectPronouns(intent.rawQuery);

      if (pronouns.length > 0) {
        // 优先使用最近提及的用户或 Bot
        if (context.lastMentionedUser) {
          intent.params.targetUser = context.lastMentionedUser;
        } else if (context.lastMentionedBot) {
          intent.params.targetBot = context.lastMentionedBot;
        }
      }
    }

    return intent;
  }

  /**
   * 时间推断（增强时间范围）
   */
  inferTimeRange(userId: string, intent: ParsedIntent): ParsedIntent {
    const context = this.getContext(userId);

    // 如果当前查询没有时间范围，但上一轮有
    if (!intent.params.timeRange && context.lastTimeRange) {
      // 某些意图类型自动继承时间范围
      if (
        intent.type === IntentType.METRICS_QUERY ||
        intent.type === IntentType.TREND_ANALYSIS
      ) {
        intent.params.timeRange = context.lastTimeRange as any;
      }
    }

    // 如果当前查询有时间范围，更新上下文
    if (intent.params.timeRange) {
      context.lastTimeRange = intent.params.timeRange;
    }

    return intent;
  }

  /**
   * 完整的上下文增强（代词 + 时间）
   */
  enhanceWithContext(userId: string, intent: ParsedIntent): ParsedIntent {
    let enhanced = intent;
    enhanced = this.resolvePronouns(userId, enhanced);
    enhanced = this.inferTimeRange(userId, enhanced);
    return enhanced;
  }

  /**
   * 获取对话历史摘要（用于调试或展示）
   */
  getHistorySummary(userId: string): string {
    const context = this.getContext(userId);

    if (context.history.length === 0) {
      return '暂无对话历史';
    }

    return context.history
      .map((turn, index) => {
        const time = turn.timestamp.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        });
        return `${index + 1}. [${time}] ${turn.query} (${turn.intent.type})`;
      })
      .join('\n');
  }

  /**
   * 清除用户上下文
   */
  clearContext(userId: string): void {
    this.contexts.delete(userId);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 检测代词
   */
  private detectPronouns(query: string): string[] {
    const pronouns: string[] = [];
    const pronounPatterns = [
      '他',
      '她',
      '它',
      '这个',
      '那个',
      '同一个',
      '刚才',
      '之前'
    ];

    for (const pattern of pronounPatterns) {
      if (query.includes(pattern)) {
        pronouns.push(pattern);
      }
    }

    return pronouns;
  }

  /**
   * 更新上下文提及（记录最近提到的用户/Bot）
   */
  private updateContextMentions(
    context: ConversationContext,
    intent: ParsedIntent
  ): void {
    if (intent.params.targetUser && intent.params.targetUser !== 'self') {
      context.lastMentionedUser = intent.params.targetUser;
    }

    if (intent.params.targetBot) {
      context.lastMentionedBot = intent.params.targetBot;
    }
  }
}
