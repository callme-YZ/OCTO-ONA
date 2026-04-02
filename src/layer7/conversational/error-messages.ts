/**
 * Layer 7: Conversational ONA - Error Messages
 * 
 * 用户友好的错误消息和建议
 */

import { IntentType } from './types';

/**
 * 错误类型
 */
export enum ErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  API_ERROR = 'API_ERROR',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * 错误消息助手
 */
export class ErrorMessages {
  /**
   * 生成权限拒绝消息
   */
  static getPermissionDeniedMessage(
    targetUser?: string,
    targetBot?: string,
    allowedTargets?: string[]
  ): string {
    let message = '😔 很抱歉，您无权查询';

    if (targetUser) {
      message += `用户 **${targetUser}** 的数据。\n\n`;
    } else if (targetBot) {
      message += ` Bot **${targetBot}** 的数据。\n\n`;
    } else {
      message += '该数据。\n\n';
    }

    message += '**您可以查询：**\n';
    message += '• 您自己的数据（"我的..."）\n';

    if (allowedTargets && allowedTargets.length > 0) {
      message += '• 您拥有的 Bot：\n';
      for (const bot of allowedTargets) {
        message += `  - ${bot}\n`;
      }
    } else {
      message += '• 您拥有的 Bot（如果有的话）\n';
    }

    message += '\n💡 **试试这些问题：**\n';
    message += '• "我的 Hub Score 是多少？"\n';
    message += '• "我的活跃度如何？"\n';

    if (allowedTargets && allowedTargets.length > 0) {
      message += `• "${allowedTargets[0]} 的数据"\n`;
    }

    return message.trim();
  }

  /**
   * 生成 API 错误消息
   */
  static getAPIErrorMessage(intentType?: IntentType): string {
    let message = '😔 很抱歉，系统暂时无法处理您的请求。\n\n';

    message += '**可能的原因：**\n';
    message += '• 分析服务正在维护\n';
    message += '• 网络连接暂时中断\n';
    message += '• 数据量过大，处理超时\n\n';

    message += '**您可以：**\n';
    message += '• 稍后重试（1-2 分钟后）\n';
    message += '• 缩小查询范围（如限制时间范围）\n';

    if (intentType === IntentType.TREND_ANALYSIS) {
      message += '• 尝试查询更短的时间跨度\n';
    }

    if (intentType === IntentType.RANKING_QUERY) {
      message += '• 减少排名数量（如 Top 5 改为 Top 3）\n';
    }

    message += '\n如果问题持续，请联系管理员。';

    return message.trim();
  }

  /**
   * 生成数据不足消息
   */
  static getDataNotFoundMessage(
    intentType: IntentType,
    targetUser?: string,
    targetBot?: string
  ): string {
    const target = targetUser || targetBot || '您';

    let message = `😔 很抱歉，没有找到 **${target}** 的相关数据。\n\n`;

    message += '**可能的原因：**\n';

    if (intentType === IntentType.METRICS_QUERY) {
      message += '• 该用户/Bot 还没有活动记录\n';
      message += '• 数据还在统计中（通常需要 1-2 小时）\n';
    } else if (intentType === IntentType.NETWORK_QUERY) {
      message += '• 该用户/Bot 还没有协作记录\n';
      message += '• 尚未建立协作关系\n';
    } else if (intentType === IntentType.TREND_ANALYSIS) {
      message += '• 时间范围内没有足够的数据点\n';
      message += '• 需要至少 3 个数据点才能分析趋势\n';
    } else if (intentType === IntentType.RANKING_QUERY) {
      message += '• 团队中还没有足够的活跃成员\n';
      message += '• 数据正在收集中\n';
    }

    message += '\n💡 **试试这些：**\n';

    if (intentType === IntentType.TREND_ANALYSIS) {
      message += '• 扩大时间范围（如"最近一个月"）\n';
      message += '• 查询其他指标\n';
    } else if (intentType === IntentType.NETWORK_QUERY) {
      message += '• 检查是否有消息互动\n';
      message += '• 等待系统同步完成\n';
    } else {
      message += '• 检查用户名/Bot 名是否正确\n';
      message += '• 查询您自己的数据确认系统运行正常\n';
    }

    return message.trim();
  }

  /**
   * 生成解析错误消息
   */
  static getParseErrorMessage(query: string): string {
    let message = '😔 很抱歉，我没太理解您的问题。\n\n';

    message += '**我可以帮您：**\n';
    message += '• 📊 查询指标（Hub Score、活跃度等）\n';
    message += '• 🌐 分析网络（协作关系）\n';
    message += '• 🏆 查看排名（Top N）\n';
    message += '• 📈 追踪趋势（时间变化）\n';
    message += '• 📝 生成报告\n\n';

    message += '💡 **试试这些问题：**\n';
    message += '• "我的 Hub Score 是多少？"\n';
    message += '• "本周的活跃度如何？"\n';
    message += '• "Top 5 最活跃的人是谁？"\n';
    message += '• "我和谁有联系？"\n\n';

    message += '输入 **/help** 查看更多示例。';

    return message.trim();
  }

  /**
   * 生成内部错误消息
   */
  static getInternalErrorMessage(): string {
    return `
😔 很抱歉，处理您的请求时发生了意外错误。

这不是您的问题，而是我们的系统出现了故障。

**请：**
• 稍后重试
• 联系管理员并提供您的查询内容

我们会尽快修复问题！
    `.trim();
  }

  /**
   * 根据错误类型生成消息
   */
  static getMessage(
    errorType: ErrorType,
    context?: {
      query?: string;
      intentType?: IntentType;
      targetUser?: string;
      targetBot?: string;
      allowedTargets?: string[];
    }
  ): string {
    switch (errorType) {
      case ErrorType.PERMISSION_DENIED:
        return this.getPermissionDeniedMessage(
          context?.targetUser,
          context?.targetBot,
          context?.allowedTargets
        );

      case ErrorType.API_ERROR:
        return this.getAPIErrorMessage(context?.intentType);

      case ErrorType.DATA_NOT_FOUND:
        return this.getDataNotFoundMessage(
          context?.intentType || IntentType.METRICS_QUERY,
          context?.targetUser,
          context?.targetBot
        );

      case ErrorType.PARSE_ERROR:
        return this.getParseErrorMessage(context?.query || '');

      case ErrorType.INTERNAL_ERROR:
        return this.getInternalErrorMessage();

      default:
        return '发生了未知错误。';
    }
  }

  /**
   * 生成建议问题
   */
  static getSuggestedQueries(intentType: IntentType, failed: boolean = true): string[] {
    if (failed) {
      // 如果当前查询失败，建议替代问题
      switch (intentType) {
        case IntentType.METRICS_QUERY:
          return [
            '我的 Hub Score 是多少？',
            '我的活跃度如何？',
            '我本周的消息数'
          ];

        case IntentType.NETWORK_QUERY:
          return [
            '我和谁有联系？',
            '我的协作网络',
            '显示我的关系图'
          ];

        case IntentType.RANKING_QUERY:
          return [
            'Top 5 最活跃的人',
            'Hub Score 前十名',
            '本周排名'
          ];

        case IntentType.TREND_ANALYSIS:
          return [
            '我的活跃度趋势',
            '本周的趋势',
            '最近一个月的变化'
          ];

        case IntentType.REPORT_GENERATION:
          return [
            '给我一份本周报告',
            '生成个人报告',
            '导出分析报告'
          ];

        default:
          return [
            '我的 Hub Score',
            '本周的活跃度',
            'Top 5 最活跃的人'
          ];
      }
    }

    // 如果当前查询成功，建议相关问题
    return [
      '查看趋势变化',
      '生成详细报告',
      '查看排名情况'
    ];
  }
}
