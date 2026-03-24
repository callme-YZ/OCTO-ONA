# OCTO-ONA

> Organizational Network Analysis Framework for Human-AI Collaboration

[English](#english) | [中文](#中文)

---

## English

### Overview

**OCTO-ONA** is a TypeScript/Node.js framework for analyzing organizational networks with a focus on Human-AI collaboration and "connoisseurship" (品鉴) metrics.

**Key Features:**
- 🤖 **Human-AI Collaboration Analysis** — Bot functional tags (T1-T5)
- 🏆 **Connoisseurship Metrics** — Hub Score, influence breadth, execution conversion
- 📊 **15 Core Metrics** — Network, collaboration, and connoisseurship indicators
- 🎨 **Interactive Dashboard** — Single-page HTML with ECharts visualizations
- 🔌 **Pluggable Data Sources** — Base adapter for any data source (DMWork included)

---

### Quick Start

#### 🚀 Fastest Way to Get Started

**Just want to see the UI?**

```bash
git clone https://github.com/callme-YZ/OCTO-ONA.git
cd OCTO-ONA
npm install
npm run start:ui
```

Then open **http://localhost:3000** in your browser!

- Click **🇬🇧 EN** or **🇨🇳 中文** to switch language
- Follow the 4-step wizard to analyze your data


#### Installation

```bash
# Clone repository
git clone https://github.com/callme-YZ/OCTO-ONA.git
cd OCTO-ONA

# Install dependencies
npm install

# Build
npm run build
```

#### Run Demo

```bash
# Generate demo dashboard
npx ts-node examples/dashboard-demo.ts

# View dashboard
open demo-dashboard.html
```

#### End-to-End Demo

```bash
# Complete pipeline: Data → Analysis → Metrics → Dashboard
npx ts-node examples/end-to-end-demo.ts

# View output
open e2e-dashboard.html
```

---

---

### v1.1 Features (New!)

- Network preview before analysis
#### 🌐 Web Configuration UI

Visual interface for non-technical users:

```bash
# Start Web UI (one command!)
npm run start:ui

# Or use development mode (auto-reload)
npm run dev:ui

# Then open in browser
# http://localhost:3000
```

**Features:**
- 4-step wizard (Data Source → Filters → Preview → Run)
- Real-time connection testing
- Network preview before analysis
- **Multi-language support** (🇬🇧 EN / 🇨🇳 中文)
- Supports Discord & GitHub (DMWork via CLI)
- Supports Discord & GitHub (DMWork via CLI)

#### 🔌 New Adapters

**Discord Adapter:**
```typescript
import { DiscordAdapter } from './src/layer1/adapters/discord-adapter';

const adapter = new DiscordAdapter();
await adapter.connect({ token: 'YOUR_BOT_TOKEN', guildId: 'YOUR_GUILD_ID' });

const graph = await adapter.extractNetwork({
  channelIds: ['channel1', 'channel2'],
  startTime: new Date('2026-01-01'),
  endTime: new Date('2026-01-31'),
});
```

**GitHub Adapter:**
```typescript
import { GitHubAdapter } from './src/layer1/adapters/github-adapter';

const adapter = new GitHubAdapter();
await adapter.connect({ token: 'ghp_xxxxx', owner: 'facebook', repo: 'react' });

const graph = await adapter.extractNetwork({
  issueStates: ['open', 'closed'],
  startTime: new Date('2026-01-01'),
  endTime: new Date('2026-01-31'),
});
```

#### 📊 Export Formats

**PDF Export:**
```typescript
import { PDFExporter } from './src/layer6/pdf-exporter';

const exporter = new PDFExporter();
const pdfBuffer = await exporter.generate(graph, metrics, {
  title: 'ONA Report',
  author: 'Your Name',
});

fs.writeFileSync('report.pdf', pdfBuffer);
```

**Excel Export:**
```typescript
import { ExcelExporter } from './src/layer6/excel-exporter';

const exporter = new ExcelExporter();
const excelBuffer = await exporter.export(metrics);

fs.writeFileSync('metrics.xlsx', excelBuffer);
```

**PNG Charts:**
```typescript
import { ImageExporter } from './src/layer6/image-exporter';

const exporter = new ImageExporter();

// Network graph
const networkImg = await exporter.exportNetworkGraph(graph);
fs.writeFileSync('network.png', networkImg);

// Hub score chart
const chartImg = await exporter.exportHubScoreChart(metrics);
fs.writeFileSync('hubscore.png', chartImg);
```

**REST API:**
```typescript
import { APIServer } from './src/layer6/api-server';

const server = new APIServer({ port: 3000, cors: true });

server.store('analysis-1', graph, metrics);

await server.start(3000);
// GET /api/v1/graphs
// GET /api/v1/graph/:id
// GET /api/v1/metrics/:id
```

#### 📈 Advanced Analytics

**Comparison Analysis:**
```typescript
import { ComparisonAnalyzer } from './src/layer5/comparison-analyzer';

const analyzer = new ComparisonAnalyzer();

const report = analyzer.compare(
  [graphWeek1, graphWeek2],
  [metricsWeek1, metricsWeek2],
  { dimension: 'time', labels: ['Week 1', 'Week 2'] }
);

console.log(`Hub Score change: ${report.changes[0].changeRate}%`);
console.log(`New nodes: ${report.nodeChanges.added.length}`);
```

**Trend Analysis:**
```typescript
import { TrendAnalyzer } from './src/layer5/trend-analyzer';

const analyzer = new TrendAnalyzer();

const report = analyzer.analyzeTrend(
  [graph1, graph2, graph3],
  [metrics1, metrics2, metrics3],
  { predictNext: true }
);

console.log(`Predicted density: ${report.trends[0].prediction}`);
console.log(`Anomalies detected: ${report.trends[0].anomalies.length}`);
```

**Health Monitoring:**
```typescript
import { HealthMonitor } from './src/layer5/health-monitor';

const monitor = new HealthMonitor();

const report = monitor.detectAnomalies(graph, metrics);

console.log(`Health score: ${report.score}/100`);
console.log(`Risk level: ${report.riskLevel}`);

for (const issue of report.issues) {
  console.log(`- ${issue.type}: ${issue.description}`);
  console.log(`  Recommendation: ${issue.recommendation}`);
}
```

**Smart Recommendations:**
```typescript
import { Recommender } from './src/layer5/recommender';

const recommender = new Recommender();

const recommendations = recommender.suggestMentions('user-123', graph, metrics, { limit: 5 });

for (const rec of recommendations) {
  console.log(`@${rec.targetName}: ${rec.reason} (score: ${rec.score})`);
}
```



---

### v1.1 Features (New!)

#### 🌐 Web Configuration UI

Visual interface for non-technical users:

```bash
# Start web UI server
npx ts-node -e "import { ConfigServer } from './src/web-ui/config-server'; const server = new ConfigServer(); server.start(3000);"

# Open browser
open http://localhost:3000
```

**Features:**
- 4-step wizard (Data Source → Filters → Preview → Run)
- Real-time connection testing
- Network preview before analysis
- Supports Discord & GitHub (DMWork via CLI)

#### 🔌 New Adapters

**Discord Adapter:**
```typescript
import { DiscordAdapter } from './src/layer1/adapters/discord-adapter';

const adapter = new DiscordAdapter();
await adapter.connect({ token: 'YOUR_BOT_TOKEN', guildId: 'YOUR_GUILD_ID' });

const graph = await adapter.extractNetwork({
  channelIds: ['channel1', 'channel2'],
  startTime: new Date('2026-01-01'),
  endTime: new Date('2026-01-31'),
});
```

**GitHub Adapter:**
```typescript
import { GitHubAdapter } from './src/layer1/adapters/github-adapter';

const adapter = new GitHubAdapter();
await adapter.connect({ token: 'ghp_xxxxx', owner: 'facebook', repo: 'react' });

const graph = await adapter.extractNetwork({
  issueStates: ['open', 'closed'],
  startTime: new Date('2026-01-01'),
  endTime: new Date('2026-01-31'),
});
```

#### 📊 Export Formats

**PDF Export:**
```typescript
import { PDFExporter } from './src/layer6/pdf-exporter';

const exporter = new PDFExporter();
const pdfBuffer = await exporter.generate(graph, metrics, {
  title: 'ONA Report',
  author: 'Your Name',
});

fs.writeFileSync('report.pdf', pdfBuffer);
```

**Excel Export:**
```typescript
import { ExcelExporter } from './src/layer6/excel-exporter';

const exporter = new ExcelExporter();
const excelBuffer = await exporter.export(metrics);

fs.writeFileSync('metrics.xlsx', excelBuffer);
```

**PNG Charts:**
```typescript
import { ImageExporter } from './src/layer6/image-exporter';

const exporter = new ImageExporter();

// Network graph
const networkImg = await exporter.exportNetworkGraph(graph);
fs.writeFileSync('network.png', networkImg);

// Hub score chart
const chartImg = await exporter.exportHubScoreChart(metrics);
fs.writeFileSync('hubscore.png', chartImg);
```

**REST API:**
```typescript
import { APIServer } from './src/layer6/api-server';

const server = new APIServer({ port: 3000, cors: true });

server.store('analysis-1', graph, metrics);

await server.start(3000);
// GET /api/v1/graphs
// GET /api/v1/graph/:id
// GET /api/v1/metrics/:id
```

#### 📈 Advanced Analytics

**Comparison Analysis:**
```typescript
import { ComparisonAnalyzer } from './src/layer5/comparison-analyzer';

const analyzer = new ComparisonAnalyzer();

const report = analyzer.compare(
  [graphWeek1, graphWeek2],
  [metricsWeek1, metricsWeek2],
  { dimension: 'time', labels: ['Week 1', 'Week 2'] }
);

console.log(`Hub Score change: ${report.changes[0].changeRate}%`);
console.log(`New nodes: ${report.nodeChanges.added.length}`);
```

**Trend Analysis:**
```typescript
import { TrendAnalyzer } from './src/layer5/trend-analyzer';

const analyzer = new TrendAnalyzer();

const report = analyzer.analyzeTrend(
  [graph1, graph2, graph3],
  [metrics1, metrics2, metrics3],
  { predictNext: true }
);

console.log(`Predicted density: ${report.trends[0].prediction}`);
console.log(`Anomalies detected: ${report.trends[0].anomalies.length}`);
```

**Health Monitoring:**
```typescript
import { HealthMonitor } from './src/layer5/health-monitor';

const monitor = new HealthMonitor();

const report = monitor.detectAnomalies(graph, metrics);

console.log(`Health score: ${report.score}/100`);
console.log(`Risk level: ${report.riskLevel}`);

for (const issue of report.issues) {
  console.log(`- ${issue.type}: ${issue.description}`);
  console.log(`  Recommendation: ${issue.recommendation}`);
}
```

**Smart Recommendations:**
```typescript
import { Recommender } from './src/layer5/recommender';

const recommender = new Recommender();

const recommendations = recommender.suggestMentions('user-123', graph, metrics, { limit: 5 });

for (const rec of recommendations) {
  console.log(`@${rec.targetName}: ${rec.reason} (score: ${rec.score})`);
}
```

### Core Concepts

#### 1. Data Model (Layer 2)

**NetworkGraph** consists of:
- `human_nodes` — Human participants
- `ai_agent_nodes` — AI bots/agents
- `edges` — Connections with weights
- `messages` — Communication records

**Supported Edge Types:**
- `H2H` — Human to Human
- `H2B` — Human to Bot
- `B2H` — Bot to Human
- `B2B` — Bot to Bot

#### 2. Metrics (Layer 4)

**15 Core Metrics (13 P0 + 2 P1):**

**Network Metrics (L1):**
- L1.1 Degree Centrality
- L1.2 Betweenness Centrality
- L1.3 Closeness Centrality (P1)
- L1.4 Network Density
- L1.5 Leadership Distance
- L1.6 Silo Index
- L1.7 Burnout Risk

**Collaboration Metrics (L2):**
- L2.1 Bot Functional Tags
- L2.2 Human-Bot Ratio

**Connoisseurship Metrics (L3):**
- L3.1 Connoisseurship Frequency
- L3.2 Influence Breadth
- L3.3 Execution Conversion
- L3.4 Network Amplification (P1)
- L3.5 Hub Score

#### 3. Bot Functional Tags (T1-T5)

Multi-label system for bot characterization:

- **T1: Cross-Team Connector** — Connects ≥3 teams
- **T2: Intra-Team Hub** — High degree, low cross-team ratio
- **T3: Human Proxy** — Strong edge weight to primary human
- **T4: Information Aggregator** — High in/out message ratio
- **T5: High Activity** — Message count ≥ P75

#### 4. Hub Score

**Definition:** Mentions received / Messages sent

**Layers:**
- **L5 (HS > 3.0)** — Strategic Authority
- **L4 (HS = ∞)** — Pure Recipient
- **L3 (0.3 ≤ HS ≤ 3.0)** — Bot Interface
- **L2 (0 < HS < 0.3)** — Active Management
- **L1 (HS = 0)** — Pure Execution
- **L0** — No Activity

---

### Architecture

```
OCTO-ONA/
├── src/
│   ├── layer1/          # Data Adapters
│   │   ├── base-adapter.ts
│   │   ├── dmwork-adapter.ts
│   │   └── validator.ts
│   ├── layer2/          # Data Models
│   │   └── models.ts
│   ├── layer3/          # Analysis Engine
│   │   ├── analysis-engine.ts
│   │   └── connoisseur-detector.ts
│   ├── layer4/          # Metrics Calculator
│   │   ├── metrics-calculator.ts
│   │   ├── core-metrics.ts
│   │   └── bot-tagger.ts
│   └── layer6/          # Visualization
│       ├── dashboard-generator.ts
│       └── dashboard-template.html
├── tests/               # Unit Tests (88 tests)
├── examples/            # Demo Scripts
├── docs/                # Documentation
└── README.md
```

---

### Usage

#### Basic Usage

```typescript
import { DashboardGenerator } from 'octo-ona';
import { NetworkGraph } from 'octo-ona';

// 1. Prepare your network data
const graph: NetworkGraph = {
  graph_id: 'my_network',
  human_nodes: [...],
  ai_agent_nodes: [...],
  edges: [...],
  messages: [...],
  // ... other fields
};

// 2. Generate dashboard
const generator = new DashboardGenerator(graph);
await generator.generate('./output.html');
```

#### Calculate Specific Metrics

```typescript
import { MetricsCalculator, ALL_CORE_METRICS } from 'octo-ona';

const calculator = new MetricsCalculator(graph);
calculator.registerMetrics(ALL_CORE_METRICS);

// Calculate all P0 metrics
const results = await calculator.calculateAll('P0');

// Calculate specific metric
const hubScore = await calculator.calculateMetric('L3.5');
```

#### Custom Data Adapter

```typescript
import { BaseAdapter } from 'octo-ona';

class MyAdapter extends BaseAdapter {
  async connect(config: any): Promise<void> {
    // Your connection logic
  }
  
  async extractNetwork(options: any): Promise<NetworkGraph> {
    // Your extraction logic
  }
  
  async disconnect(): Promise<void> {
    // Your cleanup logic
  }
}
```

---

### API Reference

See [API.md](docs/API.md) for detailed API documentation.

---

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test tests/layer4.metrics-calculator.test.ts

# Coverage
npm test -- --coverage
```

**Test Coverage:** 88/88 passed (100%)

---

### Performance

**Benchmarks (MacBook Pro M1):**

| Network Size | Nodes | Messages | Time | Memory |
|--------------|-------|----------|------|--------|
| Small | 8 | 3,800 | <1s | <100MB |
| Medium | 50 | 20,000 | ~3s | <500MB |
| Large | 200 | 100,000 | ~15s | <2GB |

---

### Known Limitations

1. **graphology library constraints:**
   - Minimum 2 nodes required for centrality metrics
   - Empty graphs not supported

2. **Beta version limitations:**
   - L3.3 only detects bot responses (no GitHub Issue/PR)
   - L3.4 uses name-based detection (no NLP similarity)

---

### Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Submit pull request

---

### License

MIT License - see [LICENSE](LICENSE) for details.

---

### Authors

- **Mayo** — Product Design & Implementation
- **∞** — Coordination & Verification
- **YZ** — Project Lead

---

### Acknowledgments

Built with:
- [graphology](https://graphology.github.io/) — Graph analysis
- [ECharts](https://echarts.apache.org/) — Visualizations
- [Zod](https://zod.dev/) — Schema validation
- [TypeScript](https://www.typescriptlang.org/) — Type safety

---

## 中文

### 概述

**OCTO-ONA** 是一个用于分析人机协作组织网络的 TypeScript/Node.js 框架，专注于"品鉴"指标。

**核心特性：**
- 🤖 **人机协作分析** — Bot功能标签（T1-T5）
- 🏆 **品鉴指标** — Hub Score、影响广度、执行转化
- 📊 **15个核心指标** — 网络、协作、品鉴三层指标
- 🎨 **交互式仪表盘** — 单页HTML + ECharts可视化
- 🔌 **可插拔数据源** — 基础适配器支持任意数据源（包含DMWork）

---

### 快速开始

#### 安装

```bash
# 克隆仓库
git clone https://github.com/callme-YZ/OCTO-ONA.git
cd OCTO-ONA

# 安装依赖
npm install

# 构建
npm run build
```

#### 运行Demo

```bash
# 生成Demo仪表盘
npx ts-node examples/dashboard-demo.ts

# 查看仪表盘
open demo-dashboard.html
```

#### 端到端Demo

```bash
# 完整流程：数据 → 分析 → 指标 → 仪表盘
npx ts-node examples/end-to-end-demo.ts

# 查看输出
open e2e-dashboard.html
```

---

### 核心概念

#### 1. 数据模型（Layer 2）

**NetworkGraph** 包含：
- `human_nodes` — 人类参与者
- `ai_agent_nodes` — AI机器人/代理
- `edges` — 带权重的连接
- `messages` — 通信记录

**支持的边类型：**
- `H2H` — 人到人
- `H2B` — 人到Bot
- `B2H` — Bot到人
- `B2B` — Bot到Bot

#### 2. 指标（Layer 4）

**15个核心指标（13个P0 + 2个P1）：**

**网络指标（L1）：**
- L1.1 度中心性
- L1.2 中介中心性
- L1.3 接近中心性（P1）
- L1.4 网络密度
- L1.5 领导层距离
- L1.6 孤岛指数
- L1.7 过载风险

**协作指标（L2）：**
- L2.1 Bot功能标签
- L2.2 人机协作比例

**品鉴指标（L3）：**
- L3.1 品鉴行为频率
- L3.2 品鉴影响广度
- L3.3 品鉴执行转化
- L3.4 品鉴网络放大（P1）
- L3.5 Hub Score

#### 3. Bot功能标签（T1-T5）

多标签Bot特征系统：

- **T1：跨团队连接** — 连接≥3个团队
- **T2：团队内枢纽** — 高度数，低跨团队比例
- **T3：人类代理** — 与主要人类强边权重
- **T4：信息聚合** — 高接收/发送消息比
- **T5：高活跃** — 消息数≥P75

#### 4. Hub Score（中枢分数）

**定义：** 被@次数 / 发送消息数

**层级：**
- **L5 (HS > 3.0)** — 战略权威
- **L4 (HS = ∞)** — 纯接收者
- **L3 (0.3 ≤ HS ≤ 3.0)** — Bot接口
- **L2 (0 < HS < 0.3)** — 活跃管理
- **L1 (HS = 0)** — 纯执行
- **L0** — 无活动

---

### 架构

```
OCTO-ONA/
├── src/
│   ├── layer1/          # 数据适配器
│   │   ├── base-adapter.ts
│   │   ├── dmwork-adapter.ts
│   │   └── validator.ts
│   ├── layer2/          # 数据模型
│   │   └── models.ts
│   ├── layer3/          # 分析引擎
│   │   ├── analysis-engine.ts
│   │   └── connoisseur-detector.ts
│   ├── layer4/          # 指标计算器
│   │   ├── metrics-calculator.ts
│   │   ├── core-metrics.ts
│   │   └── bot-tagger.ts
│   └── layer6/          # 可视化
│       ├── dashboard-generator.ts
│       └── dashboard-template.html
├── tests/               # 单元测试（88个测试）
├── examples/            # 示例脚本
├── docs/                # 文档
└── README.md
```

---

### 使用方法

#### 基本使用

```typescript
import { DashboardGenerator } from 'octo-ona';
import { NetworkGraph } from 'octo-ona';

// 1. 准备网络数据
const graph: NetworkGraph = {
  graph_id: 'my_network',
  human_nodes: [...],
  ai_agent_nodes: [...],
  edges: [...],
  messages: [...],
  // ... 其他字段
};

// 2. 生成仪表盘
const generator = new DashboardGenerator(graph);
await generator.generate('./output.html');
```

#### 计算特定指标

```typescript
import { MetricsCalculator, ALL_CORE_METRICS } from 'octo-ona';

const calculator = new MetricsCalculator(graph);
calculator.registerMetrics(ALL_CORE_METRICS);

// 计算所有P0指标
const results = await calculator.calculateAll('P0');

// 计算特定指标
const hubScore = await calculator.calculateMetric('L3.5');
```

#### 自定义数据适配器

```typescript
import { BaseAdapter } from 'octo-ona';

class MyAdapter extends BaseAdapter {
  async connect(config: any): Promise<void> {
    // 连接逻辑
  }
  
  async extractNetwork(options: any): Promise<NetworkGraph> {
    // 数据提取逻辑
  }
  
  async disconnect(): Promise<void> {
    // 清理逻辑
  }
}
```

---

### API参考

详见 [API.md](docs/API.md)

---

### 测试

```bash
# 运行所有测试
npm test

# 运行特定测试套件
npm test tests/layer4.metrics-calculator.test.ts

# 测试覆盖率
npm test -- --coverage
```

**测试覆盖：** 88/88 通过（100%）

---

### 性能

**基准测试（MacBook Pro M1）：**

| 网络规模 | 节点数 | 消息数 | 时间 | 内存 |
|---------|-------|--------|------|------|
| 小型 | 8 | 3,800 | <1秒 | <100MB |
| 中型 | 50 | 20,000 | ~3秒 | <500MB |
| 大型 | 200 | 100,000 | ~15秒 | <2GB |

---

### 已知限制

1. **graphology库约束：**
   - 中心性指标至少需要2个节点
   - 不支持空图

2. **Beta版本限制：**
   - L3.3仅检测Bot响应（无GitHub Issue/PR）
   - L3.4使用基于姓名的检测（无NLP相似度）

---

### 贡献

欢迎贡献！请：
1. Fork仓库
2. 创建功能分支
3. 为新功能添加测试
4. 提交Pull Request

---

### 许可证

MIT许可证 - 详见 [LICENSE](LICENSE)

---

### 作者

- **Mayo** — 产品设计与实现
- **∞** — 协调与验收
- **YZ** — 项目负责人

---

### 致谢

构建工具：
- [graphology](https://graphology.github.io/) — 图分析
- [ECharts](https://echarts.apache.org/) — 可视化
- [Zod](https://zod.dev/) — 模式验证
- [TypeScript](https://www.typescriptlang.org/) — 类型安全

---

**Version:** 0.8.0  
**Last Updated:** 2026-03-20

---

### v1.2 Features - External Data Loading

OCTO-ONA now supports two dashboard generation modes:

#### 1. Inline Data Mode (Original)
Single HTML file with all data embedded:
```typescript
const generator = new DashboardGenerator(graph);
await generator.generate('./dashboard.html');
```

#### 2. External Data Mode (New!)
Separate HTML and JSON files:
```typescript
const generator = new DashboardGenerator(graph);
await generator.generateWithExternalData('./dashboard-dir');
// Creates:
//   dashboard-dir/index.html  (16KB - presentation only)
//   dashboard-dir/data.json   (4KB - all metrics data)
```

**Benefits of external data mode:**
- ✅ **Separation of concerns** - HTML for presentation, JSON for data
- ✅ **Dynamic updates** - Update `data.json` without regenerating HTML
- ✅ **Version control friendly** - Easier to diff data changes
- ✅ **Smaller file sizes** - HTML is ~16KB vs ~200KB+ inline mode
- ✅ **RESTful architecture** - Can serve `data.json` via API

**Example:**
```bash
# Generate demo with external data
npx ts-node examples/dashboard-demo-external.ts

# View in browser
open demo-dashboard-external/index.html
```

The HTML uses `fetch('./data.json')` to load data at runtime, making it perfect for:
- CI/CD pipelines (update data without redeploying HTML)
- Multi-environment dashboards (same HTML, different data.json)
- Progressive web apps (cache HTML, fetch latest data)


---

## CLI Usage (v2.0)

### Sync Command

Sync data from remote database to local cache:

```bash
# Incremental sync (default)
npx octo-ona sync dmwork-octo

# Full sync
npx octo-ona sync dmwork-octo --full

# Specify time range
npx octo-ona sync dmwork-octo --start-time 2026-03-01 --end-time 2026-03-20

# Verbose output
npx octo-ona sync dmwork-octo --verbose
```

### Configuration

Create config files in project root:

**octo-remote.config.json** (Remote database):
```json
{
  "host": "remote.example.com",
  "port": 13306,
  "user": "readonly",
  "password": "your-password",
  "database": "im"
}
```

**octo-ona.config.json** (Local database):
```json
{
  "host": "localhost",
  "port": 3306,
  "user": "root",
  "password": "",
  "database": "octo_ona"
}
```

**Alternative:** Use environment variables:
```bash
export OCTO_REMOTE_HOST=remote.example.com
export OCTO_REMOTE_PORT=13306
export OCTO_REMOTE_USER=readonly
export OCTO_REMOTE_PASSWORD=your-password
export OCTO_REMOTE_DATABASE=im

export OCTO_LOCAL_HOST=localhost
export OCTO_LOCAL_PORT=3306
export OCTO_LOCAL_USER=root
export OCTO_LOCAL_PASSWORD=
export OCTO_LOCAL_DATABASE=octo_ona
```
