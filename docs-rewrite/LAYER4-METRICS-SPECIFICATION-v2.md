# OCTO-ONA 指标规范 v2.0

**更新时间**: 2026-03-19 21:42  
**核心原则**: 指标驱动设计 - 从指标需求推导数据模型和可视化  
**版本**: v2.0 (Node.js/TypeScript 重写)

---

## 版本更新

### v2.0 (2026-03-19 21:42)
- 🔄 技术栈迁移：Python → Node.js/TypeScript
- 🔄 数据验证库：Pydantic → zod
- 🔄 图算法库：NetworkX → graphology
- 🔄 数据库驱动：pymysql → mysql2
- 🔄 模板引擎：Jinja2 → ejs
- ✅ 保留所有指标定义和算法逻辑

### v1.0 (2026-03-19)
- 初始版本
- 确定21个指标（8 Bot标签 + 8 网络 + 5 品鉴）

---

## 一、指标总览（21个）

### L1: 网络基础指标（8个）
| ID | 指标名称 | 英文 | 优先级 |
|----|---------|------|--------|
| L1.1 | 度中心性 | Degree Centrality | P0 |
| L1.2 | 中介中心性 | Betweenness Centrality | P0 |
| L1.3 | 接近中心性 | Closeness Centrality | P1 |
| L1.4 | 网络密度 | Network Density | P0 |
| L1.5 | 领导层距离 | Leadership Distance | P0 |
| L1.6 | 孤岛指数 | Silo Index | P0 |
| L1.7 | 过载风险 | Burnout Risk | P0 |
| L1.8 | 瓶颈风险 | Bottleneck Risk | P1 |

### L2: 人机协作指标（6个）
| ID | 指标名称 | 英文 | 优先级 |
|----|---------|------|--------|
| L2.1 | Bot功能标签 | Bot Functional Tags | P0 |
| L2.2 | 人机协作比例 | H2B Collaboration Ratio | P0 |
| L2.3 | Bot响应比例 | B2H Response Ratio | P1 |
| L2.4 | 协调开销 | Coordination Overhead | P0 |
| L2.5 | Agent响应效率 | Agent Response Efficiency | P1 |
| L2.6 | 多Bot协同 | Multi-Bot Synergy | P2 |

### L3: 品鉴价值指标（5个）
| ID | 指标名称 | 英文 | 优先级 |
|----|---------|------|--------|
| L3.1 | 品鉴行为频率 | Connoisseurship Frequency | P0 |
| L3.2 | 品鉴影响广度 | Connoisseurship Reach | P0 |
| L3.3 | 品鉴执行转化 | Connoisseurship Conversion | P0 |
| L3.4 | 品鉴网络放大 | Connoisseurship Amplification | P1 |
| **L3.5** | **Hub Score** 🆕 | **Hub Score** | **P0** |

---

## 二、L2.1 Bot功能标签详细设计

### 设计理念

**核心思路**: 
- 不是"Bot是什么角色"（单一分类）
- 而是"Bot有哪些功能"（多标签体系）

**优势**:
- 一个Bot可以同时拥有多个标签
- 标签基于网络指标，量化可验证
- 标签可随时间演化

**理论基础**:
- 放弃Zylos 4种角色分类（缺乏学术共识）
- 采用功能维度标签（实证驱动）

---

### 标签体系（8个标签，分3个优先级）

#### **P0标签（网络层面，ONA核心）** — 5个

| 标签ID | 标签名称 | 英文 | 判定依据 |
|--------|---------|------|---------|
| T1 | 跨团队连接 | Cross-Team Connector | BC > 阈值 + 连接≥3团队 |
| T2 | 团队内枢纽 | Intra-Team Hub | Degree > 阈值 + 单团队内 |
| T3 | 人类代理 | Human Proxy | 与特定人边权重 > 阈值 |
| T4 | 信息聚合 | Information Aggregator | 高Degree + 接收消息>发送 |
| T5 | 高活跃 | High Activity | 消息数 > P75 |

**共性**: 基于网络位置和关系，体现ONA思想

#### **P1标签（个体特性，增强分析）** — 2个

| 标签ID | 标签名称 | 英文 | 判定依据 |
|--------|---------|------|---------|
| T6 | 快速响应 | Fast Responder | 平均响应时间 < 10s |
| T7 | 执行导向 | Execution-Oriented | 发送消息 > 接收消息 |

**共性**: 关注Bot自身行为表现

#### **P2标签（细分维度，可选）** — 1个

| 标签ID | 标签名称 | 英文 | 判定依据 |
|--------|---------|------|---------|
| T8 | 专业化 | Specialized | 消息集中在≤2个频道 |

---

### 标签详细定义（P0，待补充算法）

#### T1: 跨团队连接 (Cross-Team Connector)

**定义**: 打破团队孤岛，促进跨团队知识流动的Bot

**网络特征**: 
- 高Betweenness Centrality（桥梁作用）
- 连接≥3个不同团队

**判定算法**: （待详细设计）
```typescript
import { betweennessCentrality } from 'graphology-metrics/centrality';

function isCrossTeamConnector(botId: string, graph: Graph): boolean {
  const bc = betweennessCentrality(graph)[botId];
  const teams = getConnectedTeams(botId, graph);
  return bc > THRESHOLD_BC && teams.size >= 3;
}
```

**数据需求**:
- Betweenness Centrality值
- 节点的team属性
- 边的team跨度

**可视化**:
- 网络图: 标记为菱形节点
- 标签云: 显示连接的团队列表

---

#### T2: 团队内枢纽 (Intra-Team Hub)

**定义**: 在单个团队内连接多数成员的中心Bot

**网络特征**:
- 高Degree Centrality（连接数多）
- 连接主要在单一团队内

**判定算法**: （待详细设计）
```typescript
import { degreeCentrality } from 'graphology-metrics/centrality';

function isIntraTeamHub(botId: string, graph: Graph): boolean {
  const degree = degreeCentrality(graph)[botId];
  const primaryTeam = getPrimaryTeam(botId, graph);
  const crossTeamRatio = getCrossTeamEdgeRatio(botId, graph);
  return degree > THRESHOLD_DEGREE && crossTeamRatio < 0.3;
}
```

**数据需求**:
- Degree Centrality值
- 边的team跨度比例

**可视化**:
- 网络图: 节点大小 = Degree
- 团队视图: 高亮团队内中心Bot

---

#### T3: 人类代理 (Human Proxy)

**定义**: 代表特定人类节点回答问题、协调任务的Bot

**网络特征**:
- 与特定人类节点有强关系（高边权重）
- 通常由该人类创建

**判定算法**: （待详细设计）
```typescript
function isHumanProxy(botId: string, graph: Graph): boolean {
  const maxEdgeWeight = getMaxEdgeWeight(botId, graph);
  const creator = getCreator(botId);
  return maxEdgeWeight > THRESHOLD_WEIGHT || 
         hasStrongTieToCreator(botId, creator, graph);
}
```

**数据需求**:
- 边权重（消息数）
- Bot的creator_uid
- 人-Bot边的强度分布

**可视化**:
- 网络图: Bot与主人用粗线连接
- 列表: "XX的代理Bot"

---

#### T4: 信息聚合 (Information Aggregator)

**定义**: 聚合多源信息、综合观点的决策支持Bot

**网络特征**:
- 高Degree（接收多源消息）
- 接收消息 > 发送消息

**判定算法**: （待详细设计）
```typescript
import { degreeCentrality } from 'graphology-metrics/centrality';

function isInformationAggregator(botId: string, graph: Graph): boolean {
  const degree = degreeCentrality(graph)[botId];
  const inDegree = graph.inDegree(botId);
  const outDegree = graph.outDegree(botId);
  return degree > THRESHOLD_DEGREE && inDegree > outDegree;
}
```

**数据需求**:
- In-degree / Out-degree
- 消息方向统计

**可视化**:
- 桑基图: 信息流向Bot聚合
- 标签: "聚合X个来源"

---

#### T5: 高活跃 (High Activity)

**定义**: 基础分类，识别活跃Bot和边缘Bot

**网络特征**:
- 消息数高于P75分位数

**判定算法**: （待详细设计）
```typescript
function isHighActivity(botId: string, graph: Graph): boolean {
  const msgCount = getMessageCount(botId);
  const p75 = percentile(getAllBotMessageCounts(graph), 75);
  return msgCount > p75;
}
```

**数据需求**:
- 各Bot的消息数
- 消息数分布的P75值

**可视化**:
- 条形图: 活跃度排名
- 网络图: 低活跃Bot半透明

---

### 多标签示例

```typescript
interface BotTags {
  bot_id: string;
  bot_name: string;
  tags: string[];
  metrics: {
    betweenness: number;
    degree: number;
    teams_connected: number;
    msg_count: number;
    avg_response_time: number;
  };
}

const example: BotTags = {
  bot_id: "chenpipi_bot",
  bot_name: "陈皮皮",
  tags: [
    "跨团队连接",      // T1, P0
    "信息聚合",        // T4, P0
    "高活跃",          // T5, P0
    "快速响应"         // T6, P1
  ],
  metrics: {
    betweenness: 0.25,
    degree: 0.60,
    teams_connected: 4,
    msg_count: 816,
    avg_response_time: 8
  }
};
```

---

## 三、数据需求推导（基于P0标签）

### Layer 2必须提供的数据

#### 节点数据
```typescript
import { z } from 'zod';

const HumanNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: z.string(),  // 必需（T1/T2判定）
});

const AIAgentNodeSchema = z.object({
  id: z.string(),
  bot_name: z.string(),
  creator_uid: z.string(),  // 必需（T3判定）
  tags: z.array(z.string()),  // 标签列表（Layer 4计算后回填）
});
```

#### 边数据
```typescript
const EdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.enum(["H2H", "H2B", "B2H", "B2B"]),
  weight: z.number().int(),  // 消息数，必需（T3/T4判定）
  is_cross_team: z.boolean(),  // 是否跨团队边（T1/T2判定）
});
```

#### 消息数据
```typescript
const MessageSchema = z.object({
  id: z.string(),
  from_uid: z.string(),
  to_uid: z.string().optional(),
  channel_id: z.string().optional(),
  timestamp: z.date(),
  // T5需要: 消息总数统计
});
```

#### 图数据
```typescript
import Graph from 'graphology';

// 有向图（区分in/out degree）
const graph = new Graph({ type: 'directed' });

// 需要计算:
// - Betweenness Centrality (T1) - 使用 graphology-metrics
// - Degree Centrality (T2) - 使用 graphology-metrics
// - In-degree / Out-degree (T4) - graph.inDegree() / graph.outDegree()
```

---

## 四、可视化需求（基于P0标签）

### 网络图
- **节点形状**: 跨团队连接=菱形，团队内枢纽=圆形，人类代理=三角形
- **节点大小**: Degree或活跃度
- **节点颜色**: 按标签数量（多标签=深色）
- **边粗细**: 权重（人类代理到主人=粗线）

### 标签云
- 每个Bot的标签列表
- 颜色区分: P0=蓝，P1=绿，P2=灰

### 统计面板
- 各标签的Bot数量分布
- 多标签Bot占比
- 无标签Bot（边缘）数量

### 详细列表
- Bot名称 | 标签列表 | 关键指标
- 可按标签筛选

---

## 五、技术栈

### 核心依赖

```json
{
  "dependencies": {
    "zod": "^3.x",
    "graphology": "^0.25.x",
    "graphology-metrics": "^2.x",
    "mysql2": "^3.x",
    "ejs": "^3.x"
  }
}
```

### 图算法库选择

**graphology** 替代 **NetworkX**:
- 高性能（原生JS/TS）
- 类型安全
- 丰富的算法库（graphology-metrics）
- 支持有向图/无向图
- 社区活跃

### 数据验证

**zod** 替代 **Pydantic**:
- TypeScript原生支持
- 运行时类型验证
- 类型推断（z.infer）
- 组合式schema
- 错误友好

### 数据库驱动

**mysql2** 替代 **pymysql**:
- Promise支持
- 预处理语句
- 连接池管理
- TypeScript类型

### 模板引擎

**ejs** 替代 **Jinja2**:
- JavaScript语法
- 简单易用
- PDF报告生成
- HTML邮件模板

---

## 六、下一步工作

1. **定义P0标签算法** — 5个标签的详细判定逻辑和阈值
2. **基于Octo数据标定阈值** — 计算BC/Degree的P25/P50/P75分位数
3. **完善Layer 2数据模型** — 补充team字段、is_cross_team字段
4. **实现标签计算函数** — TypeScript函数，输入graph输出标签
5. **设计可视化原型** — 网络图+标签云

---

**变更记录**:
- 2026-03-19 v2.0: 技术栈迁移到Node.js/TypeScript
- 2026-03-19 v2.0: Python→TS, Pydantic→zod, NetworkX→graphology, pymysql→mysql2, Jinja2→ejs
- 2026-03-19 v1.1: 新增L3.5 Hub Score指标
- 2026-03-19 v1.0: L2.1从"Bot角色分布"改为"Bot功能标签"，采用多标签体系
- 2026-03-19 v1.0: 确定8个标签，分P0/P1/P2三级优先级
- 2026-03-19 v1.0: P0聚焦网络层面（ONA核心），P1聚焦个体特性
