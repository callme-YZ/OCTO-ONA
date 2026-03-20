# OCTO-ONA User Guide

[English](#english) | [中文](#中文)

---

## English

### Getting Started

#### Prerequisites

- Node.js ≥ 18.0.0
- npm ≥ 9.0.0
- TypeScript ≥ 5.0.0

#### Installation

```bash
git clone https://github.com/callme-YZ/OCTO-ONA.git
cd OCTO-ONA
npm install
npm run build
```

---

### Basic Workflow

#### Step 1: Prepare Data

Create a `NetworkGraph` object with your data:

```typescript
import { NetworkGraph } from 'octo-ona';

const myGraph: NetworkGraph = {
  graph_id: 'my_network',
  description: 'My organization network',
  start_time: new Date('2026-03-01'),
  end_time: new Date('2026-03-18'),
  human_nodes: [
    { id: 'u1', name: 'Alice', type: 'human', team: 'Product' },
    { id: 'u2', name: 'Bob', type: 'human', team: 'Engineering' },
  ],
  ai_agent_nodes: [
    { id: 'b1', bot_name: 'Assistant', type: 'ai_agent', capabilities: [], functional_tags: [] },
  ],
  edges: [
    { source: 'u1', target: 'u2', edge_type: 'H2H', weight: 10, is_cross_team: true, message_ids: [] },
    { source: 'b1', target: 'u1', edge_type: 'B2H', weight: 5, is_cross_team: false, message_ids: [] },
  ],
  messages: [
    { id: 'm1', from_uid: 'u1', to_uids: ['u2'], content: 'Hello', timestamp: new Date() },
  ],
  summary: {
    total_nodes: 3,
    total_humans: 2,
    total_bots: 1,
    total_edges: 2,
    total_messages: 1,
  },
  created_at: new Date(),
  version: '2.0',
};
```

#### Step 2: Generate Dashboard

```typescript
import { DashboardGenerator } from 'octo-ona';

const generator = new DashboardGenerator(myGraph);
await generator.generate('./my-dashboard.html');

console.log('Dashboard generated! Open my-dashboard.html');
```

#### Step 3: View Dashboard

Open `my-dashboard.html` in your browser to see:
- Hub Score rankings
- Bot functional tags
- Network graph
- Message timeline
- Top 10 interactions

---

### Advanced Usage

#### Calculate Custom Metrics

```typescript
import { MetricsCalculator, ALL_CORE_METRICS } from 'octo-ona';

const calculator = new MetricsCalculator(myGraph);
calculator.registerMetrics(ALL_CORE_METRICS);

// Calculate all P0 metrics
const results = await calculator.calculateAll('P0');

// Find specific metric
const hubScore = results.find(r => r.metricId === 'L3.5');
console.log('Hub Scores:', hubScore?.value);
```

#### Tag Bots

```typescript
import { BotTagger } from 'octo-ona';
import { AnalysisEngine } from 'octo-ona';

const engine = new AnalysisEngine(myGraph);
const tagger = new BotTagger(myGraph, engine);

const botResults = await tagger.tagAllBots();

for (const result of botResults) {
  console.log(`${result.botName}: ${result.tags.join(', ')}`);
}
```

---

### Data Source Adapters

#### Using DMWork Adapter

```typescript
import { DMWorkAdapter } from 'octo-ona';

const adapter = new DMWorkAdapter();

await adapter.connect({
  host: 'localhost',
  port: 3306,
  user: 'dmwork_ro',
  password: 'password',
  database: 'im',
});

const graph = await adapter.extractNetwork({
  startTime: new Date('2026-03-01'),
  endTime: new Date('2026-03-18'),
  channelIds: ['channel_1', 'channel_2'],
});

await adapter.disconnect();
```

#### Creating Custom Adapter

```typescript
import { BaseAdapter, NetworkGraph } from 'octo-ona';

class SlackAdapter extends BaseAdapter {
  private client: any;
  
  async connect(config: { token: string }): Promise<void> {
    // Initialize Slack client
    this.client = createSlackClient(config.token);
  }
  
  async extractNetwork(options: { channelId: string }): Promise<NetworkGraph> {
    // Fetch Slack data and transform to NetworkGraph
    const messages = await this.client.getMessages(options.channelId);
    
    return {
      graph_id: 'slack_network',
      // ... build NetworkGraph from Slack data
    };
  }
  
  async disconnect(): Promise<void> {
    this.client.close();
  }
}
```

---

### Configuration

#### Minimum Network Requirements

- **Nodes:** ≥ 2 (graphology limitation)
- **Edges:** ≥ 1 recommended
- **Messages:** Optional (for timeline and connoisseurship metrics)

#### Performance Tips

1. **Filter data by time range** — Extract only necessary date range
2. **Limit node count** — For <200 nodes, performance is optimal
3. **Cache results** — Store calculated metrics to avoid recomputation

---

### Troubleshooting

#### Empty Dashboard

**Problem:** Dashboard generates but shows no data

**Solution:** Check that your `NetworkGraph` has valid data:
```typescript
console.log('Nodes:', graph.human_nodes.length + graph.ai_agent_nodes.length);
console.log('Edges:', graph.edges.length);
```

#### NaN in Metrics

**Problem:** Metrics show NaN values

**Cause:** Single-node network (graphology limitation)

**Solution:** Ensure ≥2 nodes in your network

#### Slow Performance

**Problem:** Dashboard generation takes >30 seconds

**Solution:**
- Reduce time range
- Limit to specific channels/users
- Use sampling for very large networks (>500 nodes)

---

## 中文

### 入门指南

#### 前提条件

- Node.js ≥ 18.0.0
- npm ≥ 9.0.0
- TypeScript ≥ 5.0.0

#### 安装

```bash
git clone https://github.com/callme-YZ/OCTO-ONA.git
cd OCTO-ONA
npm install
npm run build
```

---

### 基本工作流

#### 步骤1：准备数据

创建 `NetworkGraph` 对象：

```typescript
import { NetworkGraph } from 'octo-ona';

const myGraph: NetworkGraph = {
  graph_id: 'my_network',
  description: '我的组织网络',
  start_time: new Date('2026-03-01'),
  end_time: new Date('2026-03-18'),
  human_nodes: [
    { id: 'u1', name: 'Alice', type: 'human', team: '产品' },
    { id: 'u2', name: 'Bob', type: 'human', team: '工程' },
  ],
  ai_agent_nodes: [
    { id: 'b1', bot_name: '助手', type: 'ai_agent', capabilities: [], functional_tags: [] },
  ],
  edges: [
    { source: 'u1', target: 'u2', edge_type: 'H2H', weight: 10, is_cross_team: true, message_ids: [] },
    { source: 'b1', target: 'u1', edge_type: 'B2H', weight: 5, is_cross_team: false, message_ids: [] },
  ],
  messages: [
    { id: 'm1', from_uid: 'u1', to_uids: ['u2'], content: '你好', timestamp: new Date() },
  ],
  summary: {
    total_nodes: 3,
    total_humans: 2,
    total_bots: 1,
    total_edges: 2,
    total_messages: 1,
  },
  created_at: new Date(),
  version: '2.0',
};
```

#### 步骤2：生成仪表盘

```typescript
import { DashboardGenerator } from 'octo-ona';

const generator = new DashboardGenerator(myGraph);
await generator.generate('./my-dashboard.html');

console.log('仪表盘已生成！打开 my-dashboard.html');
```

#### 步骤3：查看仪表盘

在浏览器中打开 `my-dashboard.html` 查看：
- Hub Score排名
- Bot功能标签
- 网络图
- 消息时间序列
- Top 10互动

---

### 最小网络要求

- **节点数：** ≥ 2（graphology限制）
- **边数：** ≥ 1（建议）
- **消息：** 可选（用于时间序列和品鉴指标）

---

**Version:** 1.0  
**Last Updated:** 2026-03-20
