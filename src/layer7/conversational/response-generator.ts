/**
 * Layer 7: Conversational ONA - Response Generator (Enhanced)
 * 
 * 响应生成器：将分析结果转换为用户友好的文本
 * 
 * 增强功能：
 * - 数字→自然语言描述
 * - 趋势描述（+8% ↗️）
 * - 建议生成
 * - 上下文附加（数据时效）
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
    const summary = this.generateBasicSummary(intent, data);
    const context = this.generateContext(intent, data);
    const suggestions = this.generateSuggestions(intent, data);

    let result = summary;
    if (context) result += `\n\n${context}`;
    if (suggestions) result += `\n\n${suggestions}`;

    return result;
  }

  /**
   * 生成 HTML 报告
   */
  async generateHTMLReport(intent: ParsedIntent, data: any): Promise<string> {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ONA 分析报告</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 30px;
    }
    h1 { 
      color: #333;
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 10px;
    }
    .meta {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .metric {
      background: #f8f9fa;
      border-left: 4px solid #4CAF50;
      padding: 15px;
      margin: 10px 0;
    }
    .metric-label {
      font-weight: bold;
      color: #555;
    }
    .metric-value {
      font-size: 24px;
      color: #4CAF50;
      margin: 5px 0;
    }
    table { 
      border-collapse: collapse;
      width: 100%;
      margin-top: 20px;
    }
    th, td { 
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th { 
      background-color: #4CAF50;
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    .trend-up { color: #4CAF50; }
    .trend-down { color: #f44336; }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 组织网络分析报告</h1>
    <div class="meta">
      <p><strong>查询:</strong> ${intent.rawQuery}</p>
      <p><strong>意图:</strong> ${this.getIntentLabel(intent.type)}</p>
      <p><strong>置信度:</strong> ${(intent.confidence * 100).toFixed(1)}%</p>
      <p><strong>生成时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
    </div>
    
    <h2>分析结果</h2>
    ${this.generateHTMLContent(intent, data)}
    
    <div class="footer">
      <p>本报告由 OCTO-ONA v3.0 自动生成</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  // ============================================================================
  // Private Methods: Basic Summary
  // ============================================================================

  private generateBasicSummary(intent: ParsedIntent, data: any): string {
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

  private generateMetricsSummary(intent: ParsedIntent, data: any): string {
    if (!data || typeof data !== 'object') {
      return '未找到相关指标数据。';
    }

    const { targetUser, targetBot } = intent.params;
    const target = this.formatTarget(targetUser, targetBot);

    if (data.hub_score !== undefined) {
      const level = this.getHubScoreLevel(data.hub_score);
      const description = this.describeNumber(data.hub_score, 'hub_score');
      const levelDesc = this.getHubScoreLevelDescription(data.hub_score);
      
      return `${target} 的 **Hub Score 为 ${description}**，属于 **${level}** 级别。\n\n${levelDesc}`;
    }

    if (data.activity_level !== undefined) {
      return `${target} 的活跃度为 **${this.describeActivityLevel(data.activity_level)}**。`;
    }

    // 通用格式
    const metrics = Object.entries(data)
      .map(([key, value]) => `- **${this.formatMetricName(key)}**: ${this.describeNumber(value as number, key)}`)
      .join('\n');
    
    return `${target} 的指标：\n${metrics}`;
  }

  private generateNetworkSummary(intent: ParsedIntent, data: any): string {
    if (!data || !data.connections) {
      return '未找到相关网络数据。';
    }

    const { targetUser } = intent.params;
    const target = this.formatTarget(targetUser);
    const connections = data.connections;

    if (Array.isArray(connections) && connections.length > 0) {
      const count = connections.length;
      const countDesc = this.describeNumber(count, 'connections');
      const list = connections.slice(0, 10).map((c: any) => `- ${c.name || c.id}`).join('\n');
      
      return `${target} 的协作网络包含 **${countDesc}** 个联系人：\n${list}${connections.length > 10 ? '\n...' : ''}`;
    }

    return `${target} 的协作网络暂时为空，建议主动建立协作关系。`;
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

    const list = ranking.map((item: any, index: number) => {
      const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
      return `${medal} **${item.name || item.id}** (${item.score || item.value})`;
    }).join('\n');

    return `🏆 排名结果（Top ${ranking.length}）：\n${list}`;
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

    // 计算趋势变化
    const trendChange = this.calculateTrendChange(trend);
    const trendDesc = this.describeTrend(trendChange);

    const summary = trend.slice(0, 5).map((point: any) => 
      `- ${point.date || point.time}: **${point.value}**`
    ).join('\n');

    return `📈 趋势分析（${this.formatTimeRange(timeRange)}）：\n${summary}\n\n${trendDesc}`;
  }

  private generateReportSummary(intent: ParsedIntent, data: any): string {
    const itemCount = Object.keys(data || {}).length;
    return `✅ 报告已生成，包含 **${itemCount}** 个数据项。`;
  }

  // ============================================================================
  // Private Methods: Context Generation
  // ============================================================================

  private generateContext(intent: ParsedIntent, data: any): string {
    const parts: string[] = [];

    // 数据时效性
    const dataFreshness = this.getDataFreshness(intent, data);
    if (dataFreshness) {
      parts.push(`ℹ️ ${dataFreshness}`);
    }

    return parts.join('\n');
  }

  private getDataFreshness(intent: ParsedIntent, data: any): string {
    // 简化实现：提示数据是实时的
    if (intent.params.timeRange) {
      const { timeRange } = intent.params;
      if (timeRange.preset) {
        return `数据范围：${this.formatTimeRange(timeRange)}`;
      }
      if (timeRange.start && timeRange.end) {
        const days = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));
        return `数据范围：最近 ${days} 天`;
      }
    }
    return '数据实时更新';
  }

  // ============================================================================
  // Private Methods: Suggestions
  // ============================================================================

  private generateSuggestions(intent: ParsedIntent, data: any): string {
    switch (intent.type) {
      case IntentType.METRICS_QUERY:
        return this.suggestForMetrics(data);
      case IntentType.NETWORK_QUERY:
        return this.suggestForNetwork(data);
      case IntentType.RANKING_QUERY:
        return this.suggestForRanking(data);
      case IntentType.TREND_ANALYSIS:
        return this.suggestForTrend(data);
      default:
        return '';
    }
  }

  private suggestForMetrics(data: any): string {
    if (data.hub_score !== undefined) {
      const score = data.hub_score;
      if (score < 0.3) {
        return '💡 **建议**: 您的 Hub Score 偏低，可以尝试：\n- 主动回复他人消息\n- 分享有价值的信息\n- 参与团队讨论';
      }
      if (score > 3.0) {
        return '🌟 **建议**: 您的影响力很高！继续保持：\n- 分享专业见解\n- 引导团队讨论\n- 培养新成员';
      }
    }
    return '';
  }

  private suggestForNetwork(data: any): string {
    if (data.connections && data.connections.length < 3) {
      return '💡 **建议**: 您的协作网络较小，建议：\n- 主动联系团队成员\n- 参与跨团队项目\n- 定期分享工作进展';
    }
    return '';
  }

  private suggestForRanking(data: any): string {
    return '💡 查看排名可以帮助您：\n- 学习活跃成员的协作模式\n- 设定个人提升目标';
  }

  private suggestForTrend(data: any): string {
    const trend = data.trend || [];
    if (trend.length >= 2) {
      const change = this.calculateTrendChange(trend);
      if (change.percentage < -10) {
        return '⚠️ **注意**: 活跃度下降明显，建议：\n- 检查是否有沟通障碍\n- 主动参与团队活动';
      }
      if (change.percentage > 20) {
        return '🎉 **太棒了**: 活跃度持续上升！';
      }
    }
    return '';
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private formatTarget(targetUser?: string, targetBot?: string): string {
    if (targetUser === 'self') return '您';
    if (targetUser) return targetUser;
    if (targetBot) return targetBot;
    return '您';
  }

  private formatMetricName(key: string): string {
    const map: Record<string, string> = {
      hub_score: 'Hub Score',
      activity_level: '活跃度',
      message_count: '消息数',
      collaboration_score: '协作度'
    };
    return map[key] || key;
  }

  private describeNumber(value: number, context?: string): string {
    if (context === 'hub_score') {
      return `${value.toFixed(2)}`;
    }
    if (context === 'connections') {
      if (value === 0) return '0（暂无）';
      if (value < 3) return `${value}（较少）`;
      if (value < 10) return `${value}（适中）`;
      return `${value}（丰富）`;
    }
    if (typeof value === 'number') {
      return value.toLocaleString('zh-CN');
    }
    return String(value);
  }

  private describeActivityLevel(level: string | number): string {
    if (typeof level === 'string') {
      const map: Record<string, string> = {
        'High': '高（非常活跃）',
        'Medium': '中（适度活跃）',
        'Low': '低（较少活跃）'
      };
      return map[level] || level;
    }
    return String(level);
  }

  private calculateTrendChange(trend: any[]): { percentage: number; direction: 'up' | 'down' | 'stable' } {
    if (trend.length < 2) return { percentage: 0, direction: 'stable' };

    const first = trend[0].value;
    const last = trend[trend.length - 1].value;
    const percentage = ((last - first) / first) * 100;

    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (percentage > 5) direction = 'up';
    if (percentage < -5) direction = 'down';

    return { percentage, direction };
  }

  private describeTrend(change: { percentage: number; direction: 'up' | 'down' | 'stable' }): string {
    const { percentage, direction } = change;
    const arrow = direction === 'up' ? '↗️' : direction === 'down' ? '↘️' : '→';
    
    if (direction === 'stable') {
      return `📊 趋势：**基本稳定** ${arrow}`;
    }

    const absPercent = Math.abs(percentage).toFixed(1);
    const changeDesc = direction === 'up' ? '上升' : '下降';
    
    return `📊 趋势：**${changeDesc} ${absPercent}%** ${arrow}`;
  }

  private formatTimeRange(timeRange?: any): string {
    if (!timeRange) return '最近';
    
    const presetMap: Record<string, string> = {
      today: '今天',
      yesterday: '昨天',
      this_week: '本周',
      last_week: '上周',
      this_month: '本月',
      last_month: '上月'
    };

    if (timeRange.preset) {
      return presetMap[timeRange.preset] || timeRange.preset;
    }

    return '自定义时间';
  }

  private getHubScoreLevel(score: number): string {
    if (score === Infinity) return 'L4 (Pure Recipient)';
    if (score > 3.0) return 'L5 (Strategic Authority)';
    if (score >= 0.3 && score <= 3.0) return 'L3 (Bot Interface)';
    if (score > 0 && score < 0.3) return 'L2 (Active Management)';
    if (score === 0) return 'L1 (Pure Execution)';
    return 'L0 (No Activity)';
  }

  private getHubScoreLevelDescription(score: number): string {
    if (score > 3.0) {
      return '您在团队中扮演战略权威角色，具有很强的影响力和领导力。';
    }
    if (score >= 0.3 && score <= 3.0) {
      return '您是团队中重要的协作接口，连接不同成员和工作流。';
    }
    if (score > 0 && score < 0.3) {
      return '您积极管理和协调工作，但影响范围相对有限。';
    }
    if (score === 0) {
      return '您主要执行任务，建议增加与团队的互动。';
    }
    return '暂无足够数据分析您的角色。';
  }

  private getIntentLabel(type: IntentType): string {
    const map: Record<IntentType, string> = {
      [IntentType.METRICS_QUERY]: '指标查询',
      [IntentType.NETWORK_QUERY]: '网络查询',
      [IntentType.RANKING_QUERY]: '排名查询',
      [IntentType.TREND_ANALYSIS]: '趋势分析',
      [IntentType.REPORT_GENERATION]: '报告生成'
    };
    return map[type] || type;
  }

  private generateHTMLContent(intent: ParsedIntent, data: any): string {
    // 简化实现：返回格式化的 JSON
    return `<div class="metric"><pre>${JSON.stringify(data, null, 2)}</pre></div>`;
  }
}

  /**
   * 生成个人报告 HTML（使用新模板）
   */
  async generatePersonalReportHTML(
    userName: string,
    timeRange: string,
    data: any,
    language: 'zh' | 'en' = 'zh'
  ): Promise<string> {
    const { ReportTemplate } = await import('./report-template');
    const template = new ReportTemplate();

    const reportData = {
      userName,
      timeRange,
      language,
      metrics: this.extractMetrics(data),
      connections: data.connections || [],
      ranking: data.ranking,
      suggestions: this.extractSuggestions(data)
    };

    return await template.renderPersonalReport(reportData);
  }

  private extractMetrics(data: any): any[] {
    const metrics = [];

    if (data.hub_score !== undefined) {
      const trend = data.hub_score_trend ? this.calculateTrendChange(data.hub_score_trend) : null;
      metrics.push({
        label: 'Hub Score',
        value: data.hub_score.toFixed(2),
        description: this.getHubScoreLevel(data.hub_score),
        trend: trend ? {
          text: `${trend.percentage > 0 ? '+' : ''}${trend.percentage.toFixed(1)}%`,
          direction: trend.direction,
          arrow: trend.direction === 'up' ? '↗️' : trend.direction === 'down' ? '↘️' : '→'
        } : undefined
      });
    }

    if (data.message_count !== undefined) {
      metrics.push({
        label: '消息数',
        value: data.message_count.toLocaleString('zh-CN'),
        description: '总消息发送量'
      });
    }

    if (data.activity_level !== undefined) {
      metrics.push({
        label: '活跃度',
        value: data.activity_level,
        description: this.describeActivityLevel(data.activity_level)
      });
    }

    return metrics;
  }

  private extractSuggestions(data: any): string[] | undefined {
    const suggestions: string[] = [];

    if (data.hub_score !== undefined && data.hub_score < 0.3) {
      suggestions.push('主动回复他人消息，增加互动');
      suggestions.push('分享有价值的信息和见解');
      suggestions.push('参与团队讨论和决策');
    }

    if (data.connections && data.connections.length < 3) {
      suggestions.push('扩展协作网络，主动联系团队成员');
      suggestions.push('参与跨团队项目');
    }

    return suggestions.length > 0 ? suggestions : undefined;
  }
}
