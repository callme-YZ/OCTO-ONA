# OCTO-ONA Layer 6 可视化层设计 v2.0

**更新时间**: 2026-03-19  
**设计原则**: 从洞察到呈现 - 多层次、可交互、易理解  
**技术栈**: TypeScript + EJS 模板引擎

---

## 一、总览

### 输出形式（4种）

1. **Web Dashboard** — 交互式（主要形式）
2. **PDF报告** — 静态分享
3. **CLI输出** — 快速查看
4. **REST API** — 数据接口

---

## 二、Dashboard页面设计（6页）

### Page 1: 概览页 (Overview)

**核心组件**:
- KPI卡片：节点数/边数/消息数/警告数
- 健康评分：综合评分条
- 网络图：力导向布局
- Top洞察：Layer 5的Top 5

**交互**: 点击节点→节点详情，点击洞察→分析页

---

### Page 2: Bot分析页 (Bot Analytics)

**核心图表**:
- 饼图：Bot功能标签分布（T1-T8）
- 条形图：Top 10活跃Bot
- 表格：Bot详情（名称/标签/消息数/Degree）
- 警示卡：边缘Bot提醒

**交互**: 点击标签→筛选Bot，点击Bot→Bot详情

---

### Page 3: 网络健康页 (Network Health)

**核心图表**:
- 仪表盘卡片：Silo Index/Density/Leadership Distance
- 热力图：团队×团队协作强度
- 列表：过载风险人员 + 孤岛团队

---

### Page 4: 品鉴分析页 (Connoisseurship)

**核心图表**:
- 条形图：品鉴者排名（按频率）
- 雷达图：单个品鉴者4维度（频率/广度/转化/放大）
- 漏斗图：品鉴→Bot响应→Issue→PR转化流程
- 文本卡片：品鉴示例（高/低转化对比）

---

### Page 5: 洞察与建议页 (Insights & Recommendations)

**核心内容**:
- 严重问题列表（Critical）
- 警告列表（Warning）
- 行动清单（优先级排序）

**展示**: 每个洞察展开显示证据+建议

---

### Page 6: 网络图详情页 (Network Graph)

**核心功能**:
- 全屏力导向布局
- 交互：Zoom/拖拽/点击节点
- 筛选：节点类型/边类型/团队

---

## 三、图表类型选择

### 网络关系
- 力导向图 (Force Graph) — 整体网络
- 热力图 (Heatmap) — 团队协作
- 桑基图 (Sankey) — 品鉴传播流

### 分布统计
- 饼图 (Pie) — Bot标签占比
- 直方图 (Histogram) — Degree分布
- 条形图 (Bar) — Top N排名

### 趋势对比
- 折线图 (Line) — 时间序列
- 雷达图 (Radar) — 多维对比
- 漏斗图 (Funnel) — 转化流程

### 指标展示
- 仪表盘 (Gauge) — 单一指标
- 卡片 (Card) — KPI
- 进度条 (Progress) — 健康评分

---

## 四、技术栈

### Web Dashboard
- 前端: Vue 3 + TypeScript
- 图表: ECharts 5.x
- UI: Element Plus
- 后端: Express + TypeScript
- 模板引擎: EJS

### PDF报告
- PDF生成: PDFKit + TypeScript
- 模板引擎: EJS
- 图表: ECharts (Server-side rendering)

### CLI输出
- 表格: cli-table3
- 颜色: chalk
- 进度条: ora

### REST API
```
GET /api/v1/reports/{report_id}
GET /api/v1/metrics/{metric_id}
GET /api/v1/insights
GET /api/v1/network/graph
```

---

## 五、配色方案

### 节点颜色
- 人类: #5470C6 (蓝色)
- Bot: #91CC75 (绿色)
- 过载: #EE6666 (红色)
- 边缘: #D3D3D3 (灰色)

### 严重程度
- Critical: #EE6666 (红色)
- Warning: #FAC858 (橙色)
- Info: #73C0DE (蓝色)

---

## 六、交互设计

### Drill-down
```
概览页
  ↓ 点击节点
节点详情
  ↓ 点击"二层网络"
二层网络图
```

### 筛选
- 全局搜索（节点名称/标签）
- 时间筛选（日期范围）
- 条件筛选（团队/类型/阈值）

### 导出
- PNG/SVG（图表）
- JSON（数据）
- CSV（表格）
- PDF（完整报告）

---

## 七、部署方式

### 本地运行
```bash
npm install -g octo-ona
octo-ona serve --port 8080
```

### Docker
```bash
docker run -p 8080:8080 octo-ona/dashboard
```

### 静态导出
```bash
octo-ona export --output report.html
```

---

## 八、实施优先级

### Phase 1: 核心页面（2周）
- Page 1: 概览页
- Page 5: 洞察与建议页

### Phase 2: 分析页面（2周）
- Page 2-4: Bot/网络/品鉴分析

### Phase 3: 增强功能（2周）
- Page 6: 交互式网络图
- PDF/CLI/API

---

## 九、TypeScript + EJS 实现示例

### 1. 基础配置

```typescript
import * as ejs from 'ejs';
import * as fs from 'fs/promises';
import * as path from 'path';

interface NetworkNode {
  name: string;
  value: number;
  category: 'human' | 'bot';
}

interface NetworkLink {
  source: string;
  target: string;
  value: number;
}

interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}
```

### 2. 渲染网络图页面

```typescript
async function renderNetworkPage(data: NetworkData): Promise<string> {
  const templatePath = path.join(__dirname, 'templates/network.ejs');
  const template = await fs.readFile(templatePath, 'utf-8');
  
  return ejs.render(template, {
    title: 'Octo团队协作网络',
    nodes: data.nodes,
    links: data.links,
    config: {
      repulsion: 100,
      edgeLength: 200
    }
  });
}
```

### 3. EJS 模板示例 (templates/network.ejs)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title><%= title %></title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
</head>
<body>
  <div id="network-chart" style="width: 100%; height: 800px;"></div>
  
  <script>
    const chart = echarts.init(document.getElementById('network-chart'));
    const option = {
      title: { text: '<%= title %>' },
      series: [{
        type: 'graph',
        layout: 'force',
        data: <%- JSON.stringify(nodes) %>,
        links: <%- JSON.stringify(links) %>,
        force: {
          repulsion: <%= config.repulsion %>,
          edgeLength: <%= config.edgeLength %>
        },
        roam: true,
        label: { show: true }
      }]
    };
    chart.setOption(option);
  </script>
</body>
</html>
```

### 4. 生成 Dashboard 概览页

```typescript
interface DashboardData {
  kpi: {
    nodeCount: number;
    edgeCount: number;
    messageCount: number;
    warningCount: number;
  };
  healthScore: number;
  topInsights: string[];
  networkData: NetworkData;
}

async function renderDashboard(data: DashboardData): Promise<string> {
  const templatePath = path.join(__dirname, 'templates/dashboard.ejs');
  const template = await fs.readFile(templatePath, 'utf-8');
  
  return ejs.render(template, {
    kpi: data.kpi,
    healthScore: data.healthScore,
    topInsights: data.topInsights,
    networkData: data.networkData
  });
}
```

### 5. Bot 分析页数据准备

```typescript
interface BotAnalytics {
  labels: { name: string; count: number }[];
  topBots: { name: string; messages: number; degree: number }[];
  edgeBots: string[];
}

async function renderBotAnalyticsPage(data: BotAnalytics): Promise<string> {
  const templatePath = path.join(__dirname, 'templates/bot-analytics.ejs');
  const template = await fs.readFile(templatePath, 'utf-8');
  
  // 饼图数据
  const pieData = data.labels.map(label => ({
    name: label.name,
    value: label.count
  }));
  
  // 条形图数据
  const barData = {
    xAxis: data.topBots.map(bot => bot.name),
    series: data.topBots.map(bot => bot.messages)
  };
  
  return ejs.render(template, {
    pieData,
    barData,
    botTable: data.topBots,
    edgeBots: data.edgeBots
  });
}
```

### 6. 网络健康页渲染

```typescript
interface NetworkHealth {
  siloIndex: number;
  density: number;
  leadershipDistance: number;
  teamCollaboration: number[][];
  overloadedUsers: string[];
  isolatedTeams: string[];
}

async function renderNetworkHealthPage(data: NetworkHealth): Promise<string> {
  const templatePath = path.join(__dirname, 'templates/network-health.ejs');
  const template = await fs.readFile(templatePath, 'utf-8');
  
  return ejs.render(template, {
    metrics: {
      siloIndex: data.siloIndex,
      density: data.density,
      leadershipDistance: data.leadershipDistance
    },
    heatmapData: data.teamCollaboration,
    alerts: {
      overloaded: data.overloadedUsers,
      isolated: data.isolatedTeams
    }
  });
}
```

### 7. 品鉴分析页

```typescript
interface ConnoisseurMetrics {
  frequency: number;
  breadth: number;
  conversion: number;
  amplification: number;
}

interface Connoisseur {
  name: string;
  metrics: ConnoisseurMetrics;
  examples: string[];
}

interface ConnoisseurshipData {
  ranking: Connoisseur[];
  funnelData: {
    connoisseurship: number;
    botResponse: number;
    issueCreated: number;
    prMerged: number;
  };
}

async function renderConnoisseurshipPage(data: ConnoisseurshipData): Promise<string> {
  const templatePath = path.join(__dirname, 'templates/connoisseurship.ejs');
  const template = await fs.readFile(templatePath, 'utf-8');
  
  // 雷达图数据（示例：第一个品鉴者）
  const radarData = data.ranking[0] ? {
    indicator: [
      { name: '频率', max: 100 },
      { name: '广度', max: 100 },
      { name: '转化', max: 100 },
      { name: '放大', max: 100 }
    ],
    value: [
      data.ranking[0].metrics.frequency,
      data.ranking[0].metrics.breadth,
      data.ranking[0].metrics.conversion,
      data.ranking[0].metrics.amplification
    ]
  } : null;
  
  return ejs.render(template, {
    ranking: data.ranking,
    radarData,
    funnel: data.funnelData
  });
}
```

### 8. 洞察与建议页

```typescript
interface Insight {
  level: 'critical' | 'warning' | 'info';
  title: string;
  evidence: string[];
  recommendations: string[];
}

interface InsightsData {
  critical: Insight[];
  warnings: Insight[];
  actions: { priority: number; description: string }[];
}

async function renderInsightsPage(data: InsightsData): Promise<string> {
  const templatePath = path.join(__dirname, 'templates/insights.ejs');
  const template = await fs.readFile(templatePath, 'utf-8');
  
  return ejs.render(template, {
    criticalIssues: data.critical,
    warnings: data.warnings,
    actionItems: data.actions.sort((a, b) => a.priority - b.priority)
  });
}
```

### 9. PDF 报告生成

```typescript
import PDFDocument from 'pdfkit';

async function generatePDFReport(data: DashboardData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    // 封面
    doc.fontSize(24).text('OCTO-ONA 网络分析报告', { align: 'center' });
    doc.moveDown();
    
    // KPI 概览
    doc.fontSize(16).text('关键指标', { underline: true });
    doc.fontSize(12).text(`节点数: ${data.kpi.nodeCount}`);
    doc.text(`边数: ${data.kpi.edgeCount}`);
    doc.text(`消息数: ${data.kpi.messageCount}`);
    doc.text(`警告数: ${data.kpi.warningCount}`);
    doc.moveDown();
    
    // 健康评分
    doc.fontSize(16).text('网络健康评分', { underline: true });
    doc.fontSize(12).text(`综合评分: ${data.healthScore}/100`);
    doc.moveDown();
    
    // Top 洞察
    doc.fontSize(16).text('重要洞察', { underline: true });
    data.topInsights.forEach((insight, i) => {
      doc.fontSize(12).text(`${i + 1}. ${insight}`);
    });
    
    doc.end();
  });
}

// 使用示例
async function exportReport(data: DashboardData, outputPath: string): Promise<void> {
  const pdfBuffer = await generatePDFReport(data);
  await fs.writeFile(outputPath, pdfBuffer);
  console.log(`报告已生成: ${outputPath}`);
}
```

### 10. CLI 输出实现

```typescript
import Table from 'cli-table3';
import chalk from 'chalk';
import ora from 'ora';

async function displayCLISummary(data: DashboardData): Promise<void> {
  const spinner = ora('加载数据...').start();
  
  // 模拟加载
  await new Promise(resolve => setTimeout(resolve, 1000));
  spinner.succeed('数据加载完成');
  
  // KPI 表格
  console.log(chalk.bold.blue('\n📊 关键指标\n'));
  const kpiTable = new Table({
    head: [chalk.cyan('指标'), chalk.cyan('数值')],
    colWidths: [20, 15]
  });
  
  kpiTable.push(
    ['节点数', data.kpi.nodeCount],
    ['边数', data.kpi.edgeCount],
    ['消息数', data.kpi.messageCount],
    ['警告数', chalk.red(data.kpi.warningCount)]
  );
  
  console.log(kpiTable.toString());
  
  // 健康评分
  console.log(chalk.bold.blue('\n💚 网络健康评分\n'));
  const scoreColor = data.healthScore >= 80 ? chalk.green :
                     data.healthScore >= 60 ? chalk.yellow :
                     chalk.red;
  console.log(scoreColor(`  ${data.healthScore}/100`));
  
  // Top 洞察
  console.log(chalk.bold.blue('\n🔍 重要洞察\n'));
  data.topInsights.forEach((insight, i) => {
    console.log(`  ${i + 1}. ${insight}`);
  });
  
  console.log('\n');
}
```

### 11. REST API 实现

```typescript
import express, { Request, Response } from 'express';

const app = express();

interface Report {
  id: string;
  timestamp: string;
  data: DashboardData;
}

// 模拟数据存储
const reports = new Map<string, Report>();

// GET /api/v1/reports/:reportId
app.get('/api/v1/reports/:reportId', async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const report = reports.get(reportId);
  
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  res.json(report);
});

// GET /api/v1/metrics/:metricId
app.get('/api/v1/metrics/:metricId', async (req: Request, res: Response) => {
  const { metricId } = req.params;
  // 根据 metricId 返回特定指标
  res.json({ metricId, value: 0.85 });
});

// GET /api/v1/insights
app.get('/api/v1/insights', async (req: Request, res: Response) => {
  const insights: Insight[] = [
    {
      level: 'critical',
      title: '发现网络孤岛',
      evidence: ['团队A与其他团队无连接'],
      recommendations: ['建立跨团队协作机制']
    }
  ];
  
  res.json(insights);
});

// GET /api/v1/network/graph
app.get('/api/v1/network/graph', async (req: Request, res: Response) => {
  const networkData: NetworkData = {
    nodes: [
      { name: 'Alice', value: 0.60, category: 'human' },
      { name: '无云', value: 0.40, category: 'bot' }
    ],
    links: [
      { source: 'Alice', target: '无云', value: 156 }
    ]
  };
  
  res.json(networkData);
});

// 启动服务器
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 12. 完整工作流示例

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

class ONAVisualization {
  private templatesDir: string;
  private outputDir: string;
  
  constructor(templatesDir: string, outputDir: string) {
    this.templatesDir = templatesDir;
    this.outputDir = outputDir;
  }
  
  async generateAllPages(data: DashboardData): Promise<void> {
    // 1. 概览页
    const overviewHTML = await renderDashboard(data);
    await this.writeFile('overview.html', overviewHTML);
    
    // 2. Bot分析页
    const botAnalytics: BotAnalytics = {
      labels: [
        { name: 'T1-代码', count: 5 },
        { name: 'T2-文档', count: 3 }
      ],
      topBots: [
        { name: '无云', messages: 1500, degree: 12 }
      ],
      edgeBots: ['Bot-X']
    };
    const botHTML = await renderBotAnalyticsPage(botAnalytics);
    await this.writeFile('bot-analytics.html', botHTML);
    
    // 3. PDF 报告
    const pdfBuffer = await generatePDFReport(data);
    await fs.writeFile(path.join(this.outputDir, 'report.pdf'), pdfBuffer);
    
    console.log('所有页面生成完成！');
  }
  
  private async writeFile(filename: string, content: string): Promise<void> {
    const filepath = path.join(this.outputDir, filename);
    await fs.writeFile(filepath, content, 'utf-8');
    console.log(`生成: ${filepath}`);
  }
}

// 使用示例
async function main() {
  const viz = new ONAVisualization(
    path.join(__dirname, 'templates'),
    path.join(__dirname, 'output')
  );
  
  const sampleData: DashboardData = {
    kpi: {
      nodeCount: 25,
      edgeCount: 89,
      messageCount: 3456,
      warningCount: 3
    },
    healthScore: 78,
    topInsights: [
      '发现3个网络孤岛',
      '2位成员过载风险',
      'Bot覆盖率偏低'
    ],
    networkData: {
      nodes: [
        { name: 'Alice', value: 0.60, category: 'human' },
        { name: '无云', value: 0.40, category: 'bot' }
      ],
      links: [
        { source: 'Alice', target: '无云', value: 156 }
      ]
    }
  };
  
  await viz.generateAllPages(sampleData);
}

main().catch(console.error);
```

---

## 十、ChatBot 可视化设计（Beta v1.0简化版）

### 单页设计

**核心功能**:
- 对话记录展示（聊天气泡）
- 品鉴标记（高亮显示）
- Bot响应追踪（Issue/PR链接）
- 简化统计卡片（品鉴次数/转化率）

### TypeScript 实现

```typescript
interface ChatMessage {
  id: string;
  user: string;
  content: string;
  timestamp: string;
  isConnoisseurship: boolean;
  botResponses?: string[];
}

interface ChatBotData {
  messages: ChatMessage[];
  stats: {
    totalConnoisseurships: number;
    conversionRate: number;
  };
}

async function renderChatBotPage(data: ChatBotData): Promise<string> {
  const templatePath = path.join(__dirname, 'templates/chatbot.ejs');
  const template = await fs.readFile(templatePath, 'utf-8');
  
  return ejs.render(template, {
    messages: data.messages,
    stats: data.stats
  });
}
```

### EJS 模板 (templates/chatbot.ejs)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>ChatBot 品鉴分析</title>
  <style>
    .chat-container { max-width: 800px; margin: 0 auto; }
    .message { padding: 10px; margin: 10px 0; border-radius: 8px; }
    .message.normal { background: #f0f0f0; }
    .message.connoisseurship { background: #fff3cd; border-left: 4px solid #ffc107; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat-card { padding: 15px; background: #e3f2fd; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="chat-container">
    <h1>ChatBot 品鉴分析</h1>
    
    <div class="stats">
      <div class="stat-card">
        <h3>品鉴总数</h3>
        <p><%= stats.totalConnoisseurships %></p>
      </div>
      <div class="stat-card">
        <h3>转化率</h3>
        <p><%= (stats.conversionRate * 100).toFixed(1) %>%</p>
      </div>
    </div>
    
    <div class="messages">
      <% messages.forEach(msg => { %>
        <div class="message <%= msg.isConnoisseurship ? 'connoisseurship' : 'normal' %>">
          <strong><%= msg.user %></strong>
          <span style="color: #888; font-size: 12px;"><%= msg.timestamp %></span>
          <p><%= msg.content %></p>
          <% if (msg.botResponses && msg.botResponses.length > 0) { %>
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
              <strong>Bot响应:</strong>
              <ul>
                <% msg.botResponses.forEach(response => { %>
                  <li><%= response %></li>
                <% }) %>
              </ul>
            </div>
          <% } %>
        </div>
      <% }) %>
    </div>
  </div>
</body>
</html>
```

---

**至此，OCTO-ONA核心设计全部完成！（TypeScript + EJS 版本）**

**变更记录**:
- 2026-03-19: v1.0初始版本，6页Dashboard设计（Python + Jinja2）
- 2026-03-19: v2.0版本，迁移到TypeScript + EJS，新增ChatBot简化设计
