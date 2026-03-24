# OCTO-ONA Architecture Design v2.0

**Date**: 2026-03-19  
**Author: OpenClaw Team  
**Status**: Draft → Design Complete (Metrics Layer)  
**Last Updated**: 2026-03-19 21:42  
**Version**: v2.0 (Node.js/TypeScript 重写)

---

## 更新日志

### v2.0 (2026-03-19 21:42)
- 🔄 技术栈迁移：Python → Node.js/TypeScript
- 🔄 数据验证库：Pydantic → zod
- 🔄 图算法库：NetworkX → graphology
- 🔄 数据库驱动：pymysql → mysql2
- 🔄 模板引擎：Jinja2 → ejs
- ✅ 保留所有设计逻辑和指标定义

### v1.1 (2026-03-19 16:46)
- ✅ 完成Layer 4指标体系详细设计（20个指标）
- ✅ Bot角色分类改为多标签功能体系（8个标签）
- ✅ L3品鉴指标基于"影响力"而非"质量"
- ✅ 所有指标都有详细算法、数据需求、可视化方案
- 📋 下一步：Layer 2数据模型设计

---

## 整体架构（6层）

```
Layer 6: 可视化层 (Visualization)
   ↓
Layer 5: 洞察引擎 (Insight Engine)
   ↓
Layer 4: 指标计算 (Metrics Computation) ✅ 已完成设计
   ↓
Layer 3: 分析引擎 (Analysis Engine)
   ↓
Layer 2: 数据模型 (Data Model)
   ↓
Layer 1: 数据适配 (Data Adapters)
```

---

## Layer 1: 数据适配层

**职责**: 从不同平台提取数据，转换为标准格式

**适配器列表**:
- DMWork Adapter
- Slack Adapter  
- Discord Adapter
- GitHub Adapter (可选)

**输出**: 标准化的网络数据（nodes + edges + messages）

---

## Layer 2: 数据模型层

**核心实体**:

### Node (节点)
```typescript
import { z } from 'zod';

const HumanNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),       // 用于Leadership Distance
  team: z.string(),       // 用于Silo Index
  email: z.string().email().optional(),
  timezone: z.string().optional(),
});

type HumanNode = z.infer<typeof HumanNodeSchema>;
```

```typescript
const AIAgentNodeSchema = z.object({
  id: z.string(),
  bot_name: z.string(),
  creator_uid: z.string(),
  capabilities: z.array(z.string()),
  tags: z.array(z.string()),  // 功能标签（T1-T8）
  avg_response_time: z.number().optional(),
});

type AIAgentNode = z.infer<typeof AIAgentNodeSchema>;
```

### Edge (边)
```typescript
const EdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.enum(["H2H", "H2B", "B2H", "B2B"]),
  weight: z.number().int(),       // 消息数
  is_cross_team: z.boolean(),     // 用于Silo Index
});

type Edge = z.infer<typeof EdgeSchema>;
```

### Message (消息)
```typescript
const MessageSchema = z.object({
  id: z.string(),
  from_uid: z.string(),
  to_uid: z.string().optional(),
  channel_id: z.string().optional(),
  content: z.string(),      // 用于品鉴识别
  timestamp: z.date(),
  mentions: z.array(z.string()),
  reply_to: z.string().optional(),  // 用于响应时间计算
  
  // Layer 3标注
  is_connoisseurship: z.boolean().optional(),
});

type Message = z.infer<typeof MessageSchema>;
```

**详细设计**: 使用 zod schema 进行类型验证

---

## Layer 3: 分析引擎

**核心组件**:

### 1. 图算法库
- graphology 基础算法
- Degree/Betweenness/Closeness Centrality
- 社区检测（Louvain）
- 桥检测

### 2. 文本分析
**品鉴识别**（规则式 + LLM增强）:
- 评价性语言：感觉、觉得、不对
- 批判性语言：为什么、怎么
- 对比性语言：比X、相比
- 品味性语言：优雅、简洁

### 3. Bot功能标签分类
**多标签体系**（8个标签，非互斥）:
- P0（网络层面）: T1-T5
- P1（个体特性）: T6-T7
- P2（细分维度）: T8

### 4. 社区检测
- 用于Silo Index计算
- 团队孤岛识别

---

## Layer 4: 指标计算层 ✅

### 完整指标体系（20个）

#### **Bot功能标签（8个）**

| 标签 | 名称 | 优先级 | 核心指标 |
|------|------|--------|---------|
| T1 | 跨团队连接 | P0 | BC + 团队数 |
| T2 | 团队内枢纽 | P0 | Degree + 跨团队比例 |
| T3 | 人类代理 | P0 | 边权重 + creator关系 |
| T4 | 信息聚合 | P0 | Degree + In/Out比 |
| T5 | 高活跃 | P0 | 消息数 > P75 |
| T6 | 快速响应 | P1 | 响应时间 < 10s |
| T7 | 执行导向 | P1 | Out > In |
| T8 | 专业化 | P2 | 频道集中度 |

**设计文档**: `BOT-TAGS-ALGORITHMS-v1.md`

---

#### **L1: 网络基础指标（8个）**

| ID | 指标 | 优先级 | 公式 | 业务含义 |
|----|------|--------|------|---------|
| L1.1 | Degree Centrality | P0 | deg(v)/(N-1) | 活跃度 |
| L1.2 | Betweenness Centrality | P0 | Σ[σst(v)/σst] | 桥梁/瓶颈 |
| L1.3 | Closeness Centrality | P1 | (N-1)/Σd(v,u) | 信息触达速度 |
| L1.4 | Network Density | P0 | 2E/(N(N-1)) | 协作紧密度 |
| L1.5 | Leadership Distance | P0 | 2步内达决策层% | 组织扁平度 |
| L1.6 | Silo Index | P0 | 弱连接团队% | 团队孤岛 |
| L1.7 | Burnout Risk | P0 | Count(BC>0.3) | 过载风险 |
| L1.8 | Bottleneck Risk | P1 | 桥节点数 | 单点故障 |

**设计文档**: `L1-BASIC-METRICS-ALGORITHMS-v1.md`

**特点**: 传统ONA核心，学术界认可，证明基础能力

---

#### **L2: 人机协作指标（被L2.1替代为Bot标签）**

原计划6个指标，现调整为：
- **L2.1**: Bot功能标签（8个多标签）← 核心
- **L2.2-L2.6**: 保留原设计（待详细定义）

**核心变更**: 
- 放弃4种角色单一分类（缺乏理论支撑）
- 改用多标签功能体系（实证驱动）

---

#### **L3: 品鉴价值指标（4个）**

| ID | 指标 | 优先级 | 公式 | 核心测量 |
|----|------|--------|------|---------|
| L3.1 | 品鉴行为频率 | P0 | 品鉴消息/总消息×100% | 品鉴活跃度 |
| L3.2 | 品鉴影响广度 | P0 | 触达节点/总节点×100% | 影响范围 |
| L3.3 | 品鉴执行转化 | P0 | 有执行/品鉴数×100% | 采纳率 |
| L3.4 | 品鉴网络放大 | P1 | 转述次数/品鉴数 | 二次传播 |

**设计文档**: `L3-CONNOISSEURSHIP-METRICS-ALGORITHMS-v1.md`

**核心原则**: 
- **不评判品鉴质量**（主观无法测量）
- **测量品鉴影响**（客观网络效应）
- **市场验证** > 主观评判

---

### 指标优先级汇总

**P0核心指标（18个）**:
- Bot标签: T1-T5（5个）
- L1基础: 6个
- L3品鉴: 3个

**P1重要指标（6个）**:
- Bot标签: T6-T7（2个）
- L1基础: 2个
- L3品鉴: 1个

**P2可选指标（1个）**:
- Bot标签: T8（1个）

---

## Layer 5: 洞察引擎

**核心功能**:
- 诊断规则库 (识别问题)
- 建议生成器 (给出行动)
- 基准对比 (行业/时间)
- 异常检测

**示例规则**:
- IF Silo Index > 15% THEN "存在严重孤岛，建议..."
- IF 品鉴频率 > 60% AND 执行转化 < 30% THEN "品鉴未被采纳，建议..."
- IF Bot无任何标签 THEN "边缘Bot，考虑下线"
- IF Coordination Overhead > 0.3 THEN "协调成本过高，建议引入Bot"

**待详细设计**: 规则库完整列表

---

## Layer 6: 可视化层

**输出形式**:
1. Web Dashboard (ECharts + Vue/React)
2. PDF报告 (ejs 模板引擎)
3. CLI输出 (cli-table3 / chalk)
4. REST API (Express.js / Fastify)

**Dashboard页面规划**:
1. **概览页**: 网络总览 + 6-8个关键指标
2. **Bot分析页**: 功能标签分布 + Top Bot排名
3. **网络健康页**: L1基础指标 + 风险预警
4. **品鉴分析页**: L3指标 + 品鉴者排名
5. **洞察建议页**: 诊断结果 + 行动建议

**待详细设计**: 原型wireframe

---

## 技术栈

| 层级 | 技术选择 | 理由 |
|------|---------|------|
| Layer 1 | Node.js/TypeScript + 各平台API | 类型安全，易维护 |
| Layer 2 | zod + JSON/Neo4j | 类型验证 + 图存储可选 |
| Layer 3 | graphology + 规则/LLM | 成熟图算法 + 文本分析 |
| Layer 4 | TypeScript + 数值计算库 | 类型安全 + 高效计算 |
| Layer 5 | Rule Engine | 可维护的诊断规则 |
| Layer 6 | ECharts + Express.js/Fastify | Web友好 + Node.js生态 |
| 数据库 | mysql2 | MySQL连接驱动 |
| 模板 | ejs | 轻量级模板引擎 |

**核心依赖**:
```json
{
  "dependencies": {
    "zod": "^3.x",
    "graphology": "^0.25.x",
    "graphology-metrics": "^2.x",
    "mysql2": "^3.x",
    "ejs": "^3.x",
    "express": "^4.x"
  }
}
```

---

## 数据流

```
原始数据 (DMWork/Slack/Discord)
   ↓ Layer 1: 提取+转换
标准网络数据 (JSON)
   ↓ Layer 2: 数据模型 (zod验证)
图结构 (graphology Graph)
   ↓ Layer 3: 分析引擎
   ├─ 图算法（中心性、社区）
   ├─ 文本分析（品鉴识别）
   └─ 标签分类（Bot功能）
   ↓ Layer 4: 指标计算
指标数据 (20个指标)
   ├─ Bot标签（8个）
   ├─ L1基础（8个）
   └─ L3品鉴（4个）
   ↓ Layer 5: 洞察引擎
诊断和建议
   ↓ Layer 6: 可视化
Dashboard/PDF/API
```

---

## 实施路线图

### Phase 1: 指标实现（6周）

**Week 1-2**: 基础标签
- T5/T8/T7（Bot标签）
- L1.1/L1.4（Degree/Density）

**Week 3-4**: 网络指标
- T2/T4（Bot标签）
- L1.2/L1.5/L1.6（BC/Leadership/Silo）

**Week 5-6**: 高级指标
- T1/T3/T6（Bot标签）
- L1.7/L1.8（Burnout/Bottleneck）

### Phase 2: 品鉴指标（4周）

**Week 1-2**: 品鉴识别
- 规则式算法
- 基于Octo数据验证

**Week 3**: 基础品鉴指标
- L3.1/L3.2（频率/广度）

**Week 4**: 高级品鉴指标
- L3.3/L3.4（转化/放大）

### Phase 3: 集成验证（2周）

- 数据模型完善
- 端到端Pipeline
- Octo数据验证

### 总计: 12周（3个月）完成核心指标

---

## 关键设计决策

### 1. Bot角色分类 → 多标签功能体系

**原因**: 
- 4种角色分类缺乏学术共识
- 现实中Bot身兼多职
- 多标签更灵活、可演化

### 2. 品鉴质量 → 品鉴影响力

**原因**:
- 质量是主观的，无法客观测量
- 影响力是客观的，基于网络数据
- 市场验证 > 主观评判

### 3. 可视化独立为Layer 6

**原因**:
- 职责分离（分析 vs 呈现）
- 可扩展（多种输出形式）
- 参考MVC架构

### 4. Python → Node.js/TypeScript

**原因**:
- 类型安全（TypeScript）
- 统一技术栈（与DMWork对齐）
- 更好的异步支持
- 丰富的Web生态

---

## 对Nature论文的支撑

### 命题1: Auditability（可审计性）

**证据**:
- 所有指标基于客观网络数据
- 品鉴行为可追踪（L3.1-L3.4）
- 决策链条透明（L3.3执行转化）

### 命题2: Connoisseurship Value（品鉴价值）

**证据**:
- L3.1: 人类持续输出专业判断
- L3.2: 判断通过网络触达组织
- L3.3: 判断驱动AI/人类执行
- L3.4: 判断被传播放大

**核心论点**:
> "AI时代，人类品鉴的价值由其网络影响力体现，而非主观质量评判。"

### 命题3: Learning Efficiency（学习效率）

**证据**:
- Bot标签演化（追踪Bot角色变化）
- 执行转化率提升（AI学习人类品鉴）
- 网络密度变化（协作效率优化）

---

## 下一步工作

### 立即优先级

1. **Layer 2数据模型**（1周）
   - 完整zod schema
   - 数据验证规则
   - 序列化/反序列化

2. **Layer 1适配器**（2周）
   - DMWork Adapter实现
   - 数据提取+转换
   - 单元测试

3. **Layer 4指标实现**（6周）
   - 按Phase 1-2路线图执行
   - 基于Octo数据验证

### 中期优先级

4. **Layer 5洞察引擎**（2周）
   - 诊断规则库
   - 建议生成器

5. **Layer 6可视化**（3周）
   - Dashboard原型
   - PDF报告模板（ejs）

### 长期优先级

6. **LLM增强**（可选）
   - 品鉴识别LLM
   - 洞察生成LLM

7. **多平台支持**
   - Slack/Discord适配器
   - 跨平台数据融合

---

**设计状态**: Layer 4完成，准备Layer 2设计  
**版本**: v2.0 (Node.js/TypeScript)
