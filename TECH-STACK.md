# OCTO-ONA Beta 技术栈

**决策时间**: 2026-03-19  
**方案**: Node.js/TypeScript 全栈

---

## 核心技术栈

### **开发语言**
- **TypeScript 5.0+**
- **Node.js 20+**

### **核心依赖（6个）**

```json
{
  "dependencies": {
    "mysql2": "^3.6.0",              // 数据库连接
    "zod": "^3.22.0",                // 数据验证
    "graphology": "^0.25.0",         // 图分析
    "graphology-metrics": "^2.0.0",  // 中心性算法
    "echarts": "^5.4.0",             // 可视化
    "ejs": "^3.1.0"                  // HTML模板
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0",              // 测试框架
    "tsx": "^4.0.0"                  // TypeScript执行器
  }
}
```

---

## 分层技术选型

### **Layer 1: 数据提取**
- **mysql2** — 数据库连接（Promise API）
- **zod** — 数据验证（Schema定义）

**示例**:
```typescript
import mysql from 'mysql2/promise';
import { z } from 'zod';

const pool = mysql.createPool({
  host: 'im-test.xming.ai',
  port: 13306,
  user: 'dmwork_ro',
  database: 'im',
});

const MessageSchema = z.object({
  id: z.string(),
  from_uid: z.string(),
  to_uids: z.array(z.string()),
  content: z.string(),
  timestamp: z.date(),
});
```

---

### **Layer 2: 数据模型**
- **zod** — Schema定义 + 类型推断

**示例**:
```typescript
import { z } from 'zod';

// NetworkGraph schema
const NetworkGraphSchema = z.object({
  graph_id: z.string(),
  human_nodes: z.array(HumanNodeSchema),
  ai_agent_nodes: z.array(AIAgentNodeSchema),
  edges: z.array(EdgeSchema),
  messages: z.array(MessageSchema),
});

// 自动推断TypeScript类型
type NetworkGraph = z.infer<typeof NetworkGraphSchema>;
```

---

### **Layer 3: 分析引擎**
- **graphology** — 图分析
- **graphology-metrics** — 中心性算法

**示例**:
```typescript
import Graph from 'graphology';
import { betweennessCentrality } from 'graphology-metrics/centrality';

const graph = new Graph();
// 构建图...

// 计算Hub Score
function calculateHubScore(graph: Graph): Record<string, number> {
  const hubScores: Record<string, number> = {};
  
  graph.forEachNode((node) => {
    const mentions = graph.inDegree(node);
    const sent = graph.outDegree(node);
    
    hubScores[node] = sent === 0 
      ? (mentions > 0 ? Infinity : 0)
      : mentions / sent;
  });
  
  return hubScores;
}
```

---

### **Layer 4: 指标计算**
- **TypeScript内置** — 统计计算

**示例**:
```typescript
class MetricsCalculator {
  calculateConnoisseurshipFrequency(node: string): number {
    const total = this.messages.filter(m => m.from_uid === node).length;
    const connoisseurship = this.messages.filter(m => 
      m.from_uid === node && this.isConnoisseurship(m.content)
    ).length;
    
    return total > 0 ? connoisseurship / total : 0;
  }
}
```

---

### **Layer 6: 可视化**
- **ECharts 5.x** — 图表库
- **ejs** — HTML模板引擎

**示例**:
```typescript
import * as ejs from 'ejs';
import * as fs from 'fs/promises';

// 渲染Dashboard
const template = await fs.readFile('templates/dashboard.ejs', 'utf-8');
const html = ejs.render(template, {
  hubScores,
  networkGraph,
  metrics,
});

await fs.writeFile('dashboard.html', html);
```

---

## 项目结构

```
octo-ona/
├── src/
│   ├── layer1/
│   │   ├── base-adapter.ts
│   │   ├── dmwork-adapter.ts
│   │   └── validator.ts
│   ├── layer2/
│   │   └── models.ts
│   ├── layer3/
│   │   └── analysis-engine.ts
│   ├── layer4/
│   │   ├── metrics-calculator.ts
│   │   ├── bot-tags.ts
│   │   ├── network-metrics.ts
│   │   └── connoisseurship-metrics.ts
│   ├── layer6/
│   │   ├── dashboard-generator.ts
│   │   └── templates/
│   │       └── dashboard.ejs
│   └── index.ts
├── tests/
├── examples/
├── package.json
├── tsconfig.json
└── README.md
```

---

## 开发工具链

### **构建工具**
- **TypeScript Compiler (tsc)** — 类型检查 + 编译
- **tsx** — TypeScript直接执行（开发时）

### **测试框架**
- **Vitest** — 快速、现代的测试框架

**示例**:
```typescript
import { describe, it, expect } from 'vitest';
import { AnalysisEngine } from '../src/layer3/analysis-engine';

describe('Hub Score Calculation', () => {
  it('should calculate infinity for passive authority', () => {
    const engine = new AnalysisEngine(networkGraph);
    const hubScores = engine.calculateHubScore();
    
    expect(hubScores['嘉伟UID']).toBe(Infinity); // 405被@, 0发送
  });
});
```

### **代码格式化**
- **Prettier** — 代码格式化
- **ESLint** — 代码质量检查

---

## 与Python方案对比

| 维度 | Python | Node.js/TypeScript |
|------|--------|-------------------|
| **类型安全** | ⭐⭐⭐ (类型提示) | ⭐⭐⭐⭐⭐ (编译时检查) |
| **图分析** | ⭐⭐⭐⭐⭐ (NetworkX) | ⭐⭐⭐⭐ (graphology) |
| **可视化** | ⭐⭐⭐ (通过CDN) | ⭐⭐⭐⭐⭐ (原生支持) |
| **技术栈统一** | ⭐⭐ | ⭐⭐⭐⭐⭐ (与OpenClaw一致) |
| **异步编程** | ⭐⭐⭐ (asyncio) | ⭐⭐⭐⭐⭐ (Promise/async) |
| **生态成熟度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 关键优势

### **1. 类型安全**
```typescript
// 编译时就能发现错误
const msg: Message = {
  id: "1",
  from_uid: "user1",
  to_uids: ["user2"],
  content: "test",
  timestamp: new Date(),
};

// ❌ 编译错误：缺少required字段
const badMsg: Message = { id: "1" }; 
```

### **2. 技术栈统一**
- OpenClaw: TypeScript
- DMWork adapter: TypeScript
- OCTO-ONA: TypeScript ← 统一！

### **3. 原生async/await**
```typescript
// 简洁的异步代码
async function extractNetwork() {
  const users = await adapter.fetchUsers();
  const messages = await adapter.fetchMessages();
  return buildNetworkGraph(users, messages);
}
```

---

## 迁移路径（如需要）

**从Node.js → Python**（如果graphology不够用）:
1. 保持Layer 1-2（数据模型用JSON交换）
2. Layer 3用Python（NetworkX）
3. Layer 4-6继续用Node.js

**从Node.js → 混合方案**:
1. 后端API: Node.js/TypeScript
2. 前端: Vue 3 + TypeScript
3. 通信: REST API

---

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式（TypeScript直接执行）
npm run dev

# 构建
npm run build

# 测试
npm test

# 类型检查
npm run typecheck

# 完整流程示例
npm run demo:octo
```

---

**技术栈确定**: Node.js/TypeScript 全栈 ✅  
**决策依据**: 类型安全 + 技术栈统一 + 可视化原生支持  
**风险评估**: 低（graphology足够用，其他库都很成熟）
