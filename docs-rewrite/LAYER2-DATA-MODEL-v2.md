# OCTO-ONA Layer 2 数据模型设计 v2.0

**更新时间**: 2026-03-19  
**设计原则**: 指标驱动 - 从Layer 4指标需求反推数据模型  
**技术栈**: TypeScript + Zod (v2.0)

---

## 一、总览

### 设计思路

**自下而上推导**:
```
Layer 4指标需求
   ↓ 提取数据字段
Layer 2数据模型
   ↓ 定义提取规则
Layer 1数据适配器
```

### 核心实体（5类）

1. **HumanNode** — 人类节点
2. **AIAgentNode** — AI Bot节点
3. **Edge** — 边（连接关系）
4. **Message** — 消息
5. **NetworkGraph** — 网络图（容器）

---

## 二、数据需求汇总（从指标反推）

### Bot标签需要的字段

| 标签 | 需要字段 |
|------|---------|
| T1 跨团队连接 | node.team, BC值 |
| T2 团队内枢纽 | node.team, Degree值 |
| T3 人类代理 | edge.weight, bot.creator_uid |
| T4 信息聚合 | In-degree, Out-degree |
| T5 高活跃 | message count |
| T6 快速响应 | message.reply_to, message.timestamp |
| T7 执行导向 | In-degree, Out-degree |
| T8 专业化 | message.channel_id |

### L1基础指标需要的字段

| 指标 | 需要字段 |
|------|---------|
| L1.1 Degree | graph基础 |
| L1.2 Betweenness | graph基础 |
| L1.3 Closeness | graph基础 |
| L1.4 Density | graph基础 |
| L1.5 Leadership Distance | node.role（识别决策层） |
| L1.6 Silo Index | node.team |
| L1.7 Burnout Risk | BC值 + node.type |
| L1.8 Bottleneck Risk | 桥检测（graph） |

### L3品鉴指标需要的字段

| 指标 | 需要字段 |
|------|---------|
| L3.1 品鉴频率 | message.content（文本）, message.from_uid |
| L3.2 影响广度 | message.mentions, message.channel_id, message.timestamp |
| L3.3 执行转化 | message.timestamp, bot_ids, Issue/PR数据（可选） |
| L3.4 网络放大 | message.content, node.name（转述检测） |

---

## 三、Zod数据模型

### 3.1 HumanNode（人类节点）

```typescript
import { z } from 'zod';

/**
 * 人类节点
 */
export const HumanNodeSchema = z.object({
  // 基础标识
  id: z.string().describe("节点唯一ID（通常是UID）"),
  name: z.string().describe("姓名"),
  
  // 组织属性（L1.5/L1.6需要）
  role: z.string().optional().describe("角色/职位（用于Leadership Distance）"),
  team: z.string().optional().describe("所属团队（用于Silo Index）"),
  
  // 联系方式（可选）
  email: z.string().email().optional().describe("邮箱"),
  timezone: z.string().optional().describe("时区"),
  
  // 元数据
  type: z.literal("human").default("human").describe("节点类型标识"),
  created_at: z.coerce.date().optional().describe("账号创建时间"),
});

export type HumanNode = z.infer<typeof HumanNodeSchema>;

// 示例数据
const exampleHumanNode: HumanNode = {
  id: "71e2a58ecce04aba972ce73c72b89f64",
  name: "黄楠",
  role: "Product Owner",
  team: "产品",
  email: "huangnan@example.com",
  type: "human"
};
```

---

### 3.2 AIAgentNode（AI Bot节点）

```typescript
import { z } from 'zod';

/**
 * AI Bot节点
 */
export const AIAgentNodeSchema = z.object({
  // 基础标识
  id: z.string().describe("Bot唯一ID"),
  bot_name: z.string().describe("Bot名称"),
  
  // 归属关系（T3需要）
  creator_uid: z.string().optional().describe("创建者UID（用于人类代理判定）"),
  
  // 能力属性
  capabilities: z.array(z.string()).default([]).describe("能力标签列表"),
  
  // Layer 4计算后回填的标签（T1-T8）
  functional_tags: z.array(z.string()).default([]).describe("功能标签（T1-T8）"),
  
  // 性能数据（T6需要）
  avg_response_time: z.number().optional().describe("平均响应时间（秒）"),
  
  // 元数据
  type: z.literal("ai_agent").default("ai_agent").describe("节点类型标识"),
  created_at: z.coerce.date().optional().describe("Bot创建时间"),
});

export type AIAgentNode = z.infer<typeof AIAgentNodeSchema>;

// 示例数据
const exampleAIAgentNode: AIAgentNode = {
  id: "wuyun_bot",
  bot_name: "无云",
  creator_uid: "eca0702f83e048c7b6151b21b1a3b9de",
  capabilities: ["code_review", "testing"],
  functional_tags: ["跨团队连接", "信息聚合", "高活跃"],
  avg_response_time: 8.5,
  type: "ai_agent"
};
```

---

### 3.3 Edge（边）

```typescript
import { z } from 'zod';

/**
 * 网络边（连接关系）
 */
export const EdgeSchema = z.object({
  // 基础连接
  source: z.string().describe("起始节点ID"),
  target: z.string().describe("目标节点ID"),
  
  // 边类型（用于人机协作分析）
  edge_type: z.enum(["H2H", "H2B", "B2H", "B2B"]).describe("边类型"),
  
  // 权重（消息数，T3需要）
  weight: z.number().int().min(1).default(1).describe("边权重（消息数）"),
  
  // 跨团队标识（L1.6需要）
  is_cross_team: z.boolean().default(false).describe("是否跨团队边"),
  
  // 详细消息列表（可选，用于深度分析）
  message_ids: z.array(z.string()).default([]).describe("该边的所有消息ID"),
  
  // 元数据
  first_interaction: z.coerce.date().optional().describe("首次交互时间"),
  last_interaction: z.coerce.date().optional().describe("最后交互时间"),
});

export type Edge = z.infer<typeof EdgeSchema>;

// 示例数据
const exampleEdge: Edge = {
  source: "71e2a58ecce04aba972ce73c72b89f64",
  target: "wuyun_bot",
  edge_type: "H2B",
  weight: 156,
  is_cross_team: false,
  message_ids: ["msg_001", "msg_002", "..."],
  first_interaction: new Date("2026-03-01T10:00:00Z"),
  last_interaction: new Date("2026-03-18T18:30:00Z")
};
```

---

### 3.4 Message（消息）

```typescript
import { z } from 'zod';

/**
 * ONA消息模型 - Beta v2.0
 * 
 * 设计原则：
 * 1. 聚焦交互关系（谁→谁），而非平台细节
 * 2. 保留必要的溯源和聚合字段（Optional）
 * 3. 简洁优先，遇到问题再扩展
 */
export const MessageSchema = z.object({
  // === 核心：交互关系 ===
  id: z.string().describe("消息唯一ID"),
  from_uid: z.string().describe("发送者UID"),
  to_uids: z.array(z.string()).describe("接收者UID列表（可能多个）"),
  
  // === 内容 ===
  content: z.string().describe("消息文本内容（品鉴识别需要）"),
  timestamp: z.coerce.date().describe("消息发送时间"),
  
  // === 关系链 ===
  reply_to: z.string().optional().describe("回复的消息ID（响应时间计算需要）"),
  
  // === 辅助：溯源和聚合（可选）===
  platform: z.string().optional().describe("数据来源平台（dmwork/slack/discord）"),
  context_id: z.string().optional().describe("上下文ID（频道/群组/话题，用于聚合分析）"),
  
  // === Layer 3标注（分析后回填）===
  is_connoisseurship: z.boolean().optional().describe("是否为品鉴消息（Layer 3标注）"),
  connoisseurship_score: z.number().optional().describe("品鉴得分（规则式算法）"),
});

export type Message = z.infer<typeof MessageSchema>;

// 示例数据
const exampleMessage: Message = {
  id: "msg_001",
  from_uid: "user_a",
  to_uids: ["wuyun_bot"],
  content: "这个UI排版有问题，太拥挤了",
  timestamp: new Date("2026-03-15T14:30:00Z"),
  reply_to: undefined,
  platform: "dmwork",
  context_id: "ch_product_team",
  is_connoisseurship: true,
  connoisseurship_score: 3.0
};

/**
 * 获取该消息的所有参与者（发送者+接收者）
 */
export function getAllParticipants(message: Message): string[] {
  return [message.from_uid, ...message.to_uids];
}
```

---

### 3.5 NetworkGraph（网络图容器）

```typescript
import { z } from 'zod';
import { HumanNodeSchema, AIAgentNodeSchema, EdgeSchema, MessageSchema } from './schemas';

/**
 * 网络图数据容器（序列化NetworkX图）
 */
export const NetworkGraphSchema = z.object({
  // 基础信息
  graph_id: z.string().describe("图ID（通常是时间范围+团队）"),
  description: z.string().describe("图描述"),
  
  // 时间范围
  start_time: z.coerce.date().describe("数据起始时间"),
  end_time: z.coerce.date().describe("数据结束时间"),
  
  // 节点列表
  human_nodes: z.array(HumanNodeSchema).default([]),
  ai_agent_nodes: z.array(AIAgentNodeSchema).default([]),
  
  // 边列表
  edges: z.array(EdgeSchema).default([]),
  
  // 消息列表（可选，可能很大）
  messages: z.array(MessageSchema).optional().describe("消息列表（可选存储）"),
  
  // 统计摘要
  summary: z.record(z.number()).default({}).describe("统计摘要"),
  
  // 元数据
  created_at: z.coerce.date().default(() => new Date()),
  platform_sources: z.array(z.string()).default([]).describe("数据来源平台"),
});

export type NetworkGraph = z.infer<typeof NetworkGraphSchema>;

// 示例数据
const exampleNetworkGraph: NetworkGraph = {
  graph_id: "octo_team_2026-03-01_to_2026-03-18",
  description: "Octo团队2026年3月1日-18日协作网络",
  start_time: new Date("2026-03-01T00:00:00Z"),
  end_time: new Date("2026-03-18T23:59:59Z"),
  human_nodes: [],
  ai_agent_nodes: [],
  edges: [],
  summary: {
    total_nodes: 15,
    human_nodes: 7,
    ai_nodes: 8,
    total_edges: 194,
    total_messages: 33770
  },
  platform_sources: ["dmwork", "discord"],
  created_at: new Date()
};

/**
 * 转换为NetworkX图对象（需要额外的JS图库，如graphology）
 */
export function toNetworkX(graph: NetworkGraph): any {
  // 示例：使用graphology库
  // import { DirectedGraph } from 'graphology';
  
  // const G = new DirectedGraph();
  
  // // 添加人类节点
  // for (const node of graph.human_nodes) {
  //   G.addNode(node.id, { ...node });
  // }
  
  // // 添加AI节点
  // for (const node of graph.ai_agent_nodes) {
  //   G.addNode(node.id, { ...node });
  // }
  
  // // 添加边
  // for (const edge of graph.edges) {
  //   G.addEdge(edge.source, edge.target, { ...edge });
  // }
  
  // return G;
  
  throw new Error("Not implemented - requires graphology or similar library");
}

/**
 * 从NetworkX图创建NetworkGraph对象
 */
export function fromNetworkX(G: any, graph_id: string, options?: Partial<NetworkGraph>): NetworkGraph {
  // 示例实现（需要实际的图库）
  throw new Error("Not implemented - requires graphology or similar library");
}
```

---

## 四、辅助数据结构

### 4.1 Issue（可选，L3.3需要）

```typescript
import { z } from 'zod';

/**
 * Issue实体（GitHub/项目管理系统）
 */
export const IssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.coerce.date(),
  creator_uid: z.string(),
  status: z.string().describe("open/closed"),
  labels: z.array(z.string()).default([]),
  
  // 关联的品鉴消息（可选）
  triggered_by_message_id: z.string().optional(),
});

export type Issue = z.infer<typeof IssueSchema>;
```

### 4.2 PullRequest（可选，L3.3需要）

```typescript
import { z } from 'zod';

/**
 * PR实体
 */
export const PullRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.coerce.date(),
  author_uid: z.string(),
  status: z.string().describe("open/merged/closed"),
  
  // 关联的Issue或品鉴
  related_issue_ids: z.array(z.string()).default([]),
  triggered_by_message_id: z.string().optional(),
});

export type PullRequest = z.infer<typeof PullRequestSchema>;
```

### 4.3 Channel（可选，辅助数据）

```typescript
import { z } from 'zod';

/**
 * 频道/群组
 */
export const ChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().describe("group/dm/channel"),
  member_ids: z.array(z.string()).default([]),
  created_at: z.coerce.date(),
});

export type Channel = z.infer<typeof ChannelSchema>;
```

---

## 五、数据验证规则

### 5.1 节点验证

```typescript
import { z } from 'zod';

/**
 * 人类节点（带自定义验证）
 */
export const HumanNodeSchemaWithValidation = z.object({
  // 基础标识
  id: z.string().min(8, "ID must be at least 8 characters"),
  name: z.string(),
  
  // 组织属性（L1.5/L1.6需要）
  role: z.string().optional(),
  team: z.string()
    .optional()
    .refine((val) => {
      if (val) {
        const allowedTeams = ['产品', '研发', '测试', '运营'];
        if (!allowedTeams.includes(val)) {
          console.warn(`Team "${val}" is not in allowed list`);
        }
      }
      return true;
    }),
  
  // 联系方式（可选）
  email: z.string().email().optional(),
  timezone: z.string().optional(),
  
  // 元数据
  type: z.literal("human").default("human"),
  created_at: z.coerce.date().optional(),
});

export type HumanNodeWithValidation = z.infer<typeof HumanNodeSchemaWithValidation>;
```

### 5.2 边验证

```typescript
import { z } from 'zod';

/**
 * 边（带自定义验证）
 */
export const EdgeSchemaWithValidation = z.object({
  source: z.string(),
  target: z.string(),
  edge_type: z.enum(["H2H", "H2B", "B2H", "B2B"]),
  weight: z.number().int().min(1, "Edge weight must be at least 1").default(1),
  is_cross_team: z.boolean().default(false),
  message_ids: z.array(z.string()).default([]),
  first_interaction: z.coerce.date().optional(),
  last_interaction: z.coerce.date().optional(),
});

export type EdgeWithValidation = z.infer<typeof EdgeSchemaWithValidation>;
```

### 5.3 消息验证

```typescript
import { z } from 'zod';

/**
 * 消息（带自定义验证）
 */
export const MessageSchemaWithValidation = z.object({
  id: z.string(),
  from_uid: z.string(),
  to_uids: z.array(z.string()),
  content: z.string().min(1, "Message content cannot be empty").trim(),
  timestamp: z.coerce.date().refine(
    (date) => date <= new Date(),
    "Message timestamp cannot be in the future"
  ),
  reply_to: z.string().optional(),
  platform: z.string().optional(),
  context_id: z.string().optional(),
  is_connoisseurship: z.boolean().optional(),
  connoisseurship_score: z.number().optional(),
});

export type MessageWithValidation = z.infer<typeof MessageSchemaWithValidation>;
```

---

## 六、数据持久化

### 6.1 JSON存储（简单方案）

```typescript
import { writeFileSync, readFileSync } from 'fs';
import { NetworkGraph, NetworkGraphSchema } from './schemas';

// 保存
const networkGraph: NetworkGraph = {
  graph_id: "octo_2026_03",
  description: "Octo团队3月协作网络",
  start_time: new Date("2026-03-01"),
  end_time: new Date("2026-03-18"),
  human_nodes: [],
  ai_agent_nodes: [],
  edges: [],
  summary: {},
  platform_sources: [],
  created_at: new Date()
};

writeFileSync(
  'octo_network.json',
  JSON.stringify(networkGraph, null, 2),
  'utf-8'
);

// 加载
const rawData = readFileSync('octo_network.json', 'utf-8');
const loadedGraph = NetworkGraphSchema.parse(JSON.parse(rawData));
```

### 6.2 数据库存储（可选，大规模数据）

**关系数据库（PostgreSQL）**:
```sql
CREATE TABLE human_nodes (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    team VARCHAR(100),
    email VARCHAR(255),
    created_at TIMESTAMP
);

CREATE TABLE ai_agent_nodes (
    id VARCHAR(64) PRIMARY KEY,
    bot_name VARCHAR(255) NOT NULL,
    creator_uid VARCHAR(64),
    avg_response_time FLOAT,
    created_at TIMESTAMP
);

CREATE TABLE edges (
    id SERIAL PRIMARY KEY,
    source VARCHAR(64) NOT NULL,
    target VARCHAR(64) NOT NULL,
    edge_type VARCHAR(10) NOT NULL,
    weight INT DEFAULT 1,
    is_cross_team BOOLEAN DEFAULT FALSE,
    first_interaction TIMESTAMP,
    last_interaction TIMESTAMP
);

CREATE TABLE messages (
    id VARCHAR(64) PRIMARY KEY,
    from_uid VARCHAR(64) NOT NULL,
    channel_id VARCHAR(64),
    content TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    reply_to VARCHAR(64),
    is_connoisseurship BOOLEAN,
    platform VARCHAR(50)
);
```

**图数据库（Neo4j，可选）**:
```cypher
// 创建人类节点
CREATE (h:Human {
    id: '71e2a58e...',
    name: '黄楠',
    role: 'Product Owner',
    team: '产品'
})

// 创建Bot节点
CREATE (b:AIAgent {
    id: 'wuyun_bot',
    bot_name: '无云',
    creator_uid: 'eca0702f...'
})

// 创建边
CREATE (h)-[:INTERACTS_WITH {weight: 156, edge_type: 'H2B'}]->(b)
```

---

## 七、数据流转

### Layer 1 → Layer 2

```typescript
import { HumanNode, AIAgentNode, Edge, NetworkGraph, Message } from './schemas';

interface RawData {
  users: any[];
  messages: any[];
  channels: any[];
}

/**
 * 将Layer 1原始数据转换为NetworkGraph
 */
function transformToNetworkGraph(rawData: RawData): NetworkGraph {
  // 1. 构建节点
  const humanNodes: HumanNode[] = [];
  const aiNodes: AIAgentNode[] = [];
  
  for (const user of rawData.users) {
    if (user.is_bot) {
      aiNodes.push({
        id: user.id,
        bot_name: user.name,
        creator_uid: user.creator_uid,
        capabilities: [],
        functional_tags: [],
        type: "ai_agent"
      });
    } else {
      humanNodes.push({
        id: user.id,
        name: user.name,
        role: user.role,
        team: user.team,
        type: "human"
      });
    }
  }
  
  // 2. 构建边（从消息聚合）
  const edges = buildEdgesFromMessages(rawData.messages);
  
  // 3. 构建NetworkGraph
  return {
    graph_id: "...",
    description: "...",
    start_time: new Date(),
    end_time: new Date(),
    human_nodes: humanNodes,
    ai_agent_nodes: aiNodes,
    edges: edges,
    messages: rawData.messages.map(m => ({ ...m } as Message)),
    summary: {},
    platform_sources: [],
    created_at: new Date()
  };
}

function buildEdgesFromMessages(messages: any[]): Edge[] {
  // 实现消息聚合为边的逻辑
  return [];
}
```

### Layer 2 → Layer 3/4

```typescript
import { readFileSync } from 'fs';
import { NetworkGraphSchema } from './schemas';

// Layer 2输出
const rawData = readFileSync('octo_network.json', 'utf-8');
const networkGraph = NetworkGraphSchema.parse(JSON.parse(rawData));

// Layer 3使用（需要图库，如graphology）
// const G = toNetworkX(networkGraph);

// Layer 4指标计算
// const degreeCentrality = calculateDegreeCentrality(G);
// const betweennessCentrality = calculateBetweennessCentrality(G);
```

---

## 八、完整示例

```typescript
import { NetworkGraph, HumanNode, AIAgentNode, Edge } from './schemas';
import { writeFileSync } from 'fs';

// 创建一个完整的NetworkGraph示例
const network: NetworkGraph = {
  graph_id: "octo_2026_03",
  description: "Octo团队3月协作网络",
  start_time: new Date("2026-03-01"),
  end_time: new Date("2026-03-18"),
  
  human_nodes: [
    {
      id: "71e2a58e...",
      name: "黄楠",
      role: "Product Owner",
      team: "产品",
      type: "human"
    },
    {
      id: "f6f40587...",
      name: "嘉伟",
      role: "Tech Lead",
      team: "研发",
      type: "human"
    }
  ],
  
  ai_agent_nodes: [
    {
      id: "wuyun_bot",
      bot_name: "无云",
      creator_uid: "eca0702f...",
      capabilities: [],
      functional_tags: ["跨团队连接", "信息聚合"],
      avg_response_time: 8.5,
      type: "ai_agent"
    }
  ],
  
  edges: [
    {
      source: "71e2a58e...",
      target: "wuyun_bot",
      edge_type: "H2B",
      weight: 156,
      is_cross_team: false,
      message_ids: []
    }
  ],
  
  summary: {
    total_nodes: 8,
    human_nodes: 2,
    ai_nodes: 1,
    total_edges: 1,
    total_messages: 156
  },
  
  platform_sources: [],
  created_at: new Date()
};

// 保存
writeFileSync(
  'octo_network.json',
  JSON.stringify(network, null, 2),
  'utf-8'
);

// 转换为图（需要图库）
// const G = toNetworkX(network);
// console.log(`Nodes: ${G.order}, Edges: ${G.size}`);
```

---

## 九、下一步

**Layer 2数据模型已完成（TypeScript + Zod版本）。**

**接下来可以**:
1. **实现Layer 1适配器** — DMWork数据提取
2. **实现数据转换** — raw_data → NetworkGraph
3. **实现Layer 3/4算法** — 基于NetworkGraph计算指标
4. **或者其他**？

---

**变更记录**:
- 2026-03-19: v1.0初始版本，定义5个核心实体（HumanNode, AIAgentNode, Edge, Message, NetworkGraph）
- 2026-03-19: v2.0技术栈变更，从Python Pydantic迁移至TypeScript + Zod，保持所有设计逻辑和章节结构不变
