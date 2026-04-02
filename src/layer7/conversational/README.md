# Layer 7: Conversational ONA

对话式组织网络分析层 - 通过自然语言对话进行协作网络分析

## 概述

Layer 7 是 OCTO-ONA v3.0 的核心层，提供：
- 🗣️ 自然语言查询解析
- 🔒 细粒度权限控制（只能查自己+自己的Bot）
- 📊 智能编排 v2.0 分析能力
- 💬 用户友好的响应生成
- 📝 完整的查询审计

## 架构

```
src/layer7/conversational/
├── types.ts              # 类型定义
├── interfaces.ts         # 接口定义
├── intent-parser.ts      # 意图解析器（Issue #40）
├── permission-checker.ts # 权限检查器（Issue #41）
├── orchestrator.ts       # 对话编排器（Issue #42）
├── response-generator.ts # 响应生成器（Issue #43）
├── audit-logger.ts       # 审计日志（Issue #42）
├── rules.yaml            # 意图识别规则（Issue #40）
└── README.md             # 本文件
```

## 核心模块

### 1. Intent Parser（意图解析器）
**职责：** 将自然语言查询解析为结构化意图
**输入：** `"我的 Hub Score 是多少？"`
**输出：**
```typescript
{
  type: IntentType.METRICS_QUERY,
  confidence: 0.95,
  params: { targetUser: 'self', metricType: 'hub_score' },
  rawQuery: "我的 Hub Score 是多少？"
}
```

### 2. Permission Checker（权限检查器）
**职责：** 验证用户是否有权执行查询
**规则：**
- ✅ 可以查询自己（`targetUser === userId`）
- ✅ 可以查询自己拥有的 Bot
- ❌ 不能查询其他用户
- ❌ 不能查询他人的 Bot

### 3. Orchestrator（编排器）
**职责：** 整合意图解析、权限检查、API 调用、响应生成
**流程：**
```
用户查询 
  → 意图解析
  → 权限检查
  → 调用 v2.0 API
  → 生成响应
  → 记录审计日志
  → 返回结果
```

### 4. Response Generator（响应生成器）
**职责：** 将分析结果转换为用户友好的文本或 HTML 报告
**示例：**
```typescript
// 输入：{ hub_score: 2.5 }
// 输出："您的 Hub Score 为 2.5，属于 L3 (Bot Interface) 级别，表示您在团队中扮演重要的协作接口角色。"
```

### 5. Audit Logger（审计日志）
**职责：** 记录所有查询和结果，用于安全审计和分析
**字段：** userId, query, intent, success, executionTime, error

## 支持的 5 类意图

| 意图 | 关键词 | 示例 |
|------|--------|------|
| **METRICS_QUERY** | Hub Score, 活跃度, 指标 | "我的 Hub Score 是多少？" |
| **NETWORK_QUERY** | 联系, 协作, 网络 | "我和谁有联系？" |
| **RANKING_QUERY** | Top, 排名, 最活跃 | "谁最活跃？" |
| **TREND_ANALYSIS** | 趋势, 变化, 最近 | "最近一周的消息量？" |
| **REPORT_GENERATION** | 报告, 总结, 分析 | "给我一份本周报告" |

## 使用示例

```typescript
import { ConversationalOrchestrator } from './layer7/conversational';

const orchestrator = new ConversationalOrchestrator({
  intentParser: new IntentParser(),
  permissionChecker: new PermissionChecker(db),
  responseGenerator: new ResponseGenerator(),
  auditLogger: new AuditLogger(db)
});

const response = await orchestrator.handleRequest({
  query: "我的 Hub Score 是多少？",
  userId: "user123"
});

console.log(response.message);
// "您的 Hub Score 为 2.5，属于 L3 (Bot Interface) 级别..."
```

## DMWork 集成

```typescript
// DMWork Bot 收到消息
dmwork.on('message', async (msg) => {
  if (msg.text.startsWith('/ona')) {
    const query = msg.text.replace('/ona', '').trim();
    
    const response = await orchestrator.handleRequest({
      query,
      userId: msg.from.id
    });
    
    await dmwork.sendMessage({
      chatId: msg.chat.id,
      text: response.message,
      attachments: response.attachments
    });
  }
});
```

## 配置

### TypeScript 配置
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

### 规则配置（rules.yaml）
```yaml
intents:
  - type: METRICS_QUERY
    keywords: [Hub Score, 活跃度, 指标, 得分]
    patterns:
      - "我的.*(Hub Score|活跃度|指标)"
      - "(查询|查看|显示).*(Hub Score|活跃度)"
    priority: 10

  - type: NETWORK_QUERY
    keywords: [联系, 协作, 网络, 关系]
    patterns:
      - "我和.*有联系"
      - ".*的协作网络"
    priority: 9
```

## 开发状态

- [x] **Issue #39** - Layer 7 目录结构（当前）
- [ ] **Issue #40** - Intent Parser 实现
- [ ] **Issue #41** - Permission Checker 实现
- [ ] **Issue #42** - Orchestrator 实现
- [ ] **Issue #43** - Response Generator 实现

## 测试

```bash
# 运行 Layer 7 单元测试
npm test -- src/layer7/conversational

# 测试覆盖率
npm run test:coverage -- src/layer7/conversational
```

## 验收标准

- ✅ 目录结构清晰
- ✅ 接口定义完整
- ✅ TypeScript 类型安全
- ✅ 文档齐全

## 依赖关系

- **Layer 1-6** - 复用 v2.0 所有分析能力
- **Database** - 查询 user_bot_ownership、审计日志
- **DMWork SDK** - 消息收发

## 性能目标

- 意图解析：< 100ms
- 权限检查：< 50ms
- 总响应时间：< 2s（含 v2.0 API 调用）

---

**版本：** v3.0.0-alpha  
**最后更新：** 2026-04-02  
**维护者：** Mayo
