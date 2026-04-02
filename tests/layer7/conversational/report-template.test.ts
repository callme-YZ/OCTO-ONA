/**
 * Layer 7: Conversational ONA - Report Template Tests
 */

import { ReportTemplate, PersonalReportData } from '../../../src/layer7/conversational/report-template';

describe('ReportTemplate', () => {
  let template: ReportTemplate;

  beforeEach(() => {
    template = new ReportTemplate();
  });

  test('Case 1: Render personal report (Chinese)', async () => {
    const data: PersonalReportData = {
      userName: '张三',
      timeRange: '2026-03-01 至 2026-03-31',
      language: 'zh',
      metrics: [
        {
          label: 'Hub Score',
          value: '2.50',
          description: 'L3 (Bot Interface)',
          trend: {
            text: '+8.0%',
            direction: 'up',
            arrow: '↗️'
          }
        },
        {
          label: '消息数',
          value: '1,234',
          description: '总消息发送量'
        }
      ],
      connections: [
        { name: '李四' },
        { name: '王五' },
        { name: 'Bot1' }
      ],
      ranking: [
        { position: 1, name: 'Alice', score: '5.0' },
        { position: 2, name: 'Bob', score: '4.0' },
        { position: 3, name: '张三', score: '2.5' }
      ],
      suggestions: [
        '主动回复他人消息',
        '分享有价值的信息'
      ]
    };

    const html = await template.renderPersonalReport(data);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('张三');
    expect(html).toContain('2.50');
    expect(html).toContain('L3 (Bot Interface)');
    expect(html).toContain('李四');
    expect(html).toContain('🥇');
  });

  test('Case 2: Render with English locale', async () => {
    const data: PersonalReportData = {
      userName: 'Alice',
      timeRange: '2026-03-01 to 2026-03-31',
      language: 'en',
      metrics: [
        {
          label: 'Hub Score',
          value: '3.20',
          description: 'L5 (Strategic Authority)'
        }
      ],
      connections: [
        { name: 'Bob' },
        { name: 'Charlie' }
      ]
    };

    const html = await template.renderPersonalReport(data);

    expect(html).toContain('Personal Network Analysis Report');
    expect(html).toContain('Alice');
    expect(html).toContain('3.20');
    expect(html).toContain('Bob');
  });

  test('Case 3: Without ranking', async () => {
    const data: PersonalReportData = {
      userName: 'Test',
      timeRange: 'This week',
      metrics: [
        { label: 'Test', value: '1', description: 'Test metric' }
      ],
      connections: []
    };

    const html = await template.renderPersonalReport(data);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Test');
    expect(html).not.toContain('🥇'); // No ranking
  });

  test('Case 4: CSS and styling present', async () => {
    const data: PersonalReportData = {
      userName: 'User',
      timeRange: 'N/A',
      metrics: [],
      connections: []
    };

    const html = await template.renderPersonalReport(data);

    expect(html).toContain('<style>');
    expect(html).toContain('.container');
    expect(html).toContain('.metric-card');
    expect(html).toContain('gradient');
  });
});
