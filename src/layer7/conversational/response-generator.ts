/**
 * Layer 7: Conversational ONA - Response Generator
 * 
 * 响应生成器：将分析结果转换为用户友好的文本
 */

import { IResponseGenerator } from './interfaces';
import { ParsedIntent, IntentType } from './types';

/**
 * 响应生成器实现
 */
export class ResponseGenerator implements IResponseGenerator {
  /**
   * 生成用户友好的文本回复
   */
  async generateTextSummary(intent: ParsedIntent, data: any): Promise<string> {
    switch (intent.type) {
      case IntentType.METRICS_QUERY:
        return this.generateMetricsSummary(intent, data);
      
      case IntentType.NETWORK_QUERY:
        return this.generateNetworkSummary(intent, data);
      
      case IntentType.RANKING_QUERY:
        return this.generateRankingSummary(intent, data);
      
      case IntentType.TREND_ANALYSIS:
        return this.generateTrendSummary(intent, data);
      
      case IntentType.REPORT_GENERATION:
        return this.generateReportSummary(intent, data);
      
      default:
        return '查询结果已生成。';
    }
  }

  /**
   * 生成 HTML 报告
   */
  async generateHTMLReport(intent: ParsedIntent, data: any): Promise<string> {
    // 简化实现：返回基本 HTML 结构
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ONA 分析报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
  </style>
</head>
<body>
  <h1>组织网络分析报告</h1>
  <p><strong>查询:</strong> ${intent.rawQuery}</p>
  <p><strong>意图:</strong> ${intent.type}</p>
  <p><strong>置信度:</strong> ${(intent.confidence * 100).toFixed(1)}%</p>
  <h2>分析结果</h2>
  <pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>
    `.trim();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateMetricsSummary(intent: ParsedIntent, data: any): string {
    if (!data || typeof data !== 'object') {
      return '未找到相关指标数据。';
    }

    const { targetUser, targetBot, metricType } = intent.params;
    const target = targetUser || targetBot || '您';

    if (data.hub_score !== undefined) {
      const level = this.getHubScoreLevel(data.hub_score);
      return `${target} 的 Hub Score 为 **${data.hub_score.toFixed(2)}**，属于 ${level} 级别。`;
    }

    if (data.activity_level !== undefined) {
      return `${target} 的活跃度为 **${data.activity_level}**。`;
    }

    if (metricType) {
      const value = data[metricType];
      if (value !== undefined) {
        return `${target} 的 ${metricType} 为 **${value}**。`;
      }
    }

    // 通用格式
    const metrics = Object.entries(data)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');
    
    return `${target} 的指标：\n${metrics}`;
  }

  private generateNetworkSummary(intent: ParsedIntent, data: any): string {
    if (!data || !data.connections) {
      return '未找到相关网络数据。';
    }

    const { targetUser } = intent.params;
    const target = targetUser || '您';
    const connections = data.connections;

    if (Array.isArray(connections) && connections.length > 0) {
      const list = connections.slice(0, 10).map((c: any) => `- ${c.name || c.id}`).join('\n');
      return `${target} 的协作网络包含 ${connections.length} 个联系人：\n${list}${connections.length > 10 ? '\n...' : ''}`;
    }

    return `${target} 的协作网络为空。`;
  }

  private generateRankingSummary(intent: ParsedIntent, data: any): string {
    if (!data || !Array.isArray(data.ranking)) {
      return '未找到排名数据。';
    }

    const { limit } = intent.params;
    const ranking = data.ranking.slice(0, limit || 10);

    if (ranking.length === 0) {
      return '暂无排名数据。';
    }

    const list = ranking.map((item: any, index: number) => 
      `${index + 1}. ${item.name || item.id} (${item.score || item.value})`
    ).join('\n');

    return `排名结果（Top ${ranking.length}）：\n${list}`;
  }

  private generateTrendSummary(intent: ParsedIntent, data: any): string {
    if (!data || !Array.isArray(data.trend)) {
      return '未找到趋势数据。';
    }

    const { timeRange } = intent.params;
    const trend = data.trend;

    if (trend.length === 0) {
      return '暂无趋势数据。';
    }

    const summary = trend.map((point: any) => 
      `- ${point.date || point.time}: ${point.value}`
    ).join('\n');

    return `趋势分析（${timeRange?.preset || '自定义时间范围'}）：\n${summary}`;
  }

  private generateReportSummary(intent: ParsedIntent, data: any): string {
    return `报告已生成。包含 ${Object.keys(data || {}).length} 个数据项。`;
  }

  private getHubScoreLevel(score: number): string {
    if (score === Infinity) return 'L4 (Pure Recipient)';
    if (score > 3.0) return 'L5 (Strategic Authority)';
    if (score >= 0.3 && score <= 3.0) return 'L3 (Bot Interface)';
    if (score > 0 && score < 0.3) return 'L2 (Active Management)';
    if (score === 0) return 'L1 (Pure Execution)';
    return 'L0 (No Activity)';
  }
}
