/**
 * Layer 7: Conversational ONA - Report Template
 * 
 * 个人报告模板渲染器
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface PersonalReportData {
  userName: string;
  timeRange: string;
  language?: 'zh' | 'en';
  metrics: Array<{
    label: string;
    value: string;
    description: string;
    trend?: {
      text: string;
      direction: 'up' | 'down' | 'stable';
      arrow: string;
    };
  }>;
  connections: Array<{ name: string }>;
  ranking?: Array<{
    position: number;
    name: string;
    score: string;
    medal?: string;
  }>;
  suggestions?: string[];
}

export class ReportTemplate {
  private templateCache: Map<string, string> = new Map();

  async renderPersonalReport(data: PersonalReportData): Promise<string> {
    const template = await this.loadTemplate('personal-report.html');
    return this.render(template, this.prepareTemplateData(data));
  }

  private prepareTemplateData(data: PersonalReportData): Record<string, any> {
    const lang = data.language || 'zh';
    const i18n = this.getI18n(lang);

    return {
      language: lang,
      title: i18n.title,
      subtitle: i18n.subtitle,
      userName: data.userName,
      timeRange: data.timeRange,
      generatedAt: new Date().toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US'),
      keyMetricsTitle: i18n.keyMetricsTitle,
      metrics: data.metrics,
      networkTitle: i18n.networkTitle,
      connections: data.connections.slice(0, 8),
      connectionsSummary: i18n.connectionsSummary.replace('{count}', data.connections.length.toString()),
      showRanking: !!data.ranking && data.ranking.length > 0,
      rankingTitle: i18n.rankingTitle,
      ranking: data.ranking?.map((item, index) => ({
        ...item,
        medal: index < 3 ? ['🥇', '🥈', '🥉'][index] : undefined
      })),
      suggestions: data.suggestions,
      suggestionsTitle: i18n.suggestionsTitle,
      footerText: i18n.footerText,
      poweredBy: i18n.poweredBy
    };
  }

  private render(template: string, data: Record<string, any>): string {
    let result = template;

    // Handle {{#if condition}}...{{/if}}
    result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, 
      (_match: string, key: string, content: string) => {
        return data[key] ? content : '';
      }
    );

    // Handle {{#each array}}...{{/each}}
    result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (_match: string, key: string, itemTemplate: string) => {
        const array = data[key];
        if (!Array.isArray(array)) return '';
        
        return array.map((item: any) => {
          let itemHtml = itemTemplate;
          itemHtml = itemHtml.replace(/\{\{this\.(\w+)\}\}/g, 
            (_m: string, prop: string) => item[prop] !== undefined ? item[prop] : ''
          );
          itemHtml = itemHtml.replace(/\{\{#if\s+this\.(\w+)\}\}/g,
            (_m: string, prop: string) => item[prop] ? '' : '<!--'
          );
          itemHtml = itemHtml.replace(/\{\{\/if\}\}/g, () => '-->');
          return itemHtml;
        }).join('');
      }
    );

    // Handle {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) => {
      return data[key] !== undefined ? data[key] : '';
    });

    // Clean comments
    result = result.replace(/<!--[\s\S]*?-->/g, '');

    return result;
  }

  private async loadTemplate(filename: string): Promise<string> {
    if (this.templateCache.has(filename)) {
      return this.templateCache.get(filename)!;
    }

    const templatePath = path.join(__dirname, 'templates', filename);
    const content = await fs.readFile(templatePath, 'utf-8');
    this.templateCache.set(filename, content);
    return content;
  }

  private getI18n(lang: 'zh' | 'en'): Record<string, string> {
    if (lang === 'en') {
      return {
        title: 'Personal Network Analysis Report',
        subtitle: 'Organizational Network Analysis',
        keyMetricsTitle: 'Key Metrics',
        networkTitle: 'Collaboration Network',
        connectionsSummary: 'You have {count} connections',
        rankingTitle: 'Team Ranking',
        suggestionsTitle: 'Suggestions',
        footerText: 'This report is automatically generated',
        poweredBy: 'Powered by OCTO-ONA v3.0'
      };
    }

    return {
      title: '个人网络分析报告',
      subtitle: '组织网络分析',
      keyMetricsTitle: '关键指标',
      networkTitle: '协作网络',
      connectionsSummary: '您有 {count} 个协作联系人',
      rankingTitle: '团队排名',
      suggestionsTitle: '💡 改进建议',
      footerText: '本报告由系统自动生成',
      poweredBy: 'Powered by OCTO-ONA v3.0'
    };
  }
}
