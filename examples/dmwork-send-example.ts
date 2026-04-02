/**
 * DMWork Integration Example
 * 
 * 演示如何使用 DMWorkIntegration 发送消息和附件
 */

import { DMWorkIntegration } from '../src/layer7/conversational/dmwork-integration';
import { ReportTemplate } from '../src/layer7/conversational/report-template';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  // 1. 从环境变量读取配置
  const botToken = process.env.DMWORK_BOT_TOKEN;
  const targetUserId = process.env.DMWORK_TARGET_USER;

  if (!botToken || !targetUserId) {
    console.error('Error: Please set DMWORK_BOT_TOKEN and DMWORK_TARGET_USER');
    console.error('Example:');
    console.error('  export DMWORK_BOT_TOKEN=bf_xxxxx');
    console.error('  export DMWORK_TARGET_USER=user_id');
    process.exit(1);
  }

  // 2. 创建 DMWork 集成
  const dmwork = new DMWorkIntegration({
    botToken,
    apiUrl: 'https://example.com/api' // 使用示例 URL，避免泄露真实地址
  });

  console.log('Testing DMWork connection...');
  const connected = await dmwork.testConnection();
  console.log(`Connection: ${connected ? 'OK' : 'FAILED'}`);

  // 3. 生成示例报告 HTML
  console.log('\nGenerating sample report...');
  const template = new ReportTemplate();
  const reportHtml = await template.renderPersonalReport({
    userName: '测试用户',
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
      { name: '张三' },
      { name: '李四' },
      { name: 'Bot1' }
    ],
    ranking: [
      { position: 1, name: 'Alice', score: '5.0' },
      { position: 2, name: 'Bob', score: '4.0' },
      { position: 3, name: 'Charlie', score: '2.5' }
    ],
    suggestions: [
      '主动回复他人消息，增加互动',
      '分享有价值的信息和见解'
    ]
  });

  // 4. 保存到临时文件
  const tmpDir = '/tmp/octo-ona-example';
  await fs.mkdir(tmpDir, { recursive: true });
  const reportPath = path.join(tmpDir, 'report.html');
  await fs.writeFile(reportPath, reportHtml, 'utf-8');
  console.log(`Report saved to: ${reportPath}`);

  // 5. 发送消息 + 附件
  console.log('\nSending message with attachment...');
  await dmwork.sendMessage({
    channelId: targetUserId,
    channelType: 1,
    message: '📊 您的个人网络分析报告已生成，请查看附件。',
    attachmentPath: reportPath
  });

  console.log('✅ Message sent successfully!');
}

// Run
if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
