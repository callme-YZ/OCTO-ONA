# Layer 7: Conversational ONA

对话式组织网络分析层 — 通过自然语言查询和 DMWork Bot 集成，提供用户友好的 ONA 分析体验。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Conversational Layer                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌───────────────┐    ┌─────────────┐ │
│  │ IntentParser │ ──▶│PermissionCheck│ ──▶│ Orchestrator│ │
│  └──────────────┘    └───────────────┘    └─────────────┘ │
│         │                    │                    │        │
│         ▼                    ▼                    ▼        │
│  ┌──────────────┐    ┌───────────────┐    ┌─────────────┐ │
│  │  rules.yaml  │    │  user_bot_    │    │ v2.0 APIs   │ │
│  │  (5 intents) │    │  ownership DB │    │ (analysis)  │ │
│  └──────────────┘    └───────────────┘    └─────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            ResponseGenerator                         │  │
│  │  • Text Summary (natural language)                   │  │
│  │  • Trend Description (+8% ↗️)                        │  │
│  │  • Suggestions (actionable tips)                     │  │
│  │  • Context (data freshness)                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         ReportTemplate (HTML)                        │  │
│  │  • Personal Report (i18n: zh/en)                     │  │
│  │  • Modern CSS (gradient, responsive)                 │  │
│  │  • Metric cards, network viz, ranking               │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        DMWorkIntegration                             │  │
│  │  • Send text + file messages                         │  │
│  │  • File upload (100MB max)                           │  │
│  │  • Error handling + retry                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          AuditLogger                                 │  │
│  │  • Log all queries (success + failure)               │  │
│  │  • conversational_query_logs table                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 核心模块

### 1. IntentParser（意图解析器）
- **功能**：将自然语言查询转换为结构化意图
- **支持意图**：
  - METRICS_QUERY — 指标查询（Hub Score、活跃度）
  - NETWORK_QUERY — 网络查询（协作关系）
  - RANKING_QUERY — 排名查询（Top N）
  - TREND_ANALYSIS — 趋势分析（时间序列）
  - REPORT_GENERATION — 报告生成
- **参数提取**：
  - targetUser / targetBot — 查询对象
  - metricType — 指标类型
  - timeRange — 时间范围
  - limit — 结果数量
  - reportFormat — 报告格式

### 2. PermissionChecker（权限检查器）
- **功能**：细粒度权限控制
- **规则**：用户只能查询 self + owned_bots
- **数据库**：`user_bot_ownership` 表
- **友好提示**：权限拒绝时给出清晰的错误信息

### 3. ConversationalOrchestrator（编排器）
- **完整流程**：
  1. Parse query → 解析意图
  2. Check permission → 权限验证
  3. Invoke v2.0 API → 调用分析接口
  4. Generate response → 生成用户友好文本
  5. Log audit → 记录审计日志
- **错误处理**：
  - Permission denied → 友好提示
  - API error → 降级处理
  - Unexpected error → 兜底处理

### 4. ResponseGenerator（响应生成器）
- **自然语言描述**：
  - 数字 → 描述（2 → "2（较少）"）
  - Hub Score → 级别映射（L0-L5）
  - Activity Level → 友好描述
- **趋势描述**：
  - +8% ↗️（上升）
  - -15% ↘️（下降）
  - ±5% →（稳定）
- **智能建议**：
  - 低 Hub Score → 主动回复、分享、参与
  - 小网络 → 扩展协作、跨团队项目
  - 趋势下降 → 检查沟通障碍
- **上下文信息**：
  - 数据时效（实时 / 时间范围）
  - 数据范围（最近 N 天）

### 5. ReportTemplate（报告模板）
- **模板引擎**：简化版 Handlebars
  - `{{variable}}`
  - `{{#if condition}}...{{/if}}`
  - `{{#each array}}...{{/each}}`
- **国际化**：中文 + 英文
- **模板文件**：`templates/personal-report.html`
- **内容模块**：
  - 渐变色 Header
  - 元信息（用户、时间、生成时间）
  - 关键指标卡片（带趋势徽章）
  - 网络可视化（中心节点 + 连接）
  - 排名列表（🥇🥈🥉）
  - 建议部分（💡）
  - 页脚
- **响应式设计**：移动端友好 + 打印优化

### 6. DMWorkIntegration（DMWork 集成）
- **消息发送**：
  - 文本消息（type=1）
  - 图片消息（type=2）
  - 文件消息（type=8）
- **附件上传**：
  - 最大 100MB
  - 自动识别图片格式（jpg/png/gif/webp）
  - 返回 CDN URL
- **错误处理**：
  - 网络错误 → 抛出异常
  - 文件不存在 → 抛出异常
  - API 错误 → 抛出异常
- **连接测试**：`testConnection()` 方法

### 7. AuditLogger（审计日志）
- **日志记录**：
  - 所有查询（成功 + 失败）
  - 字段：id, timestamp, user_id, query, intent, success, execution_time_ms, error
- **查询功能**：
  - 按用户过滤
  - 按时间范围过滤
  - 限制结果数量
- **安全性**：日志失败不影响主流程

## 使用示例

### 基本查询

```typescript
import { ConversationalOrchestrator } from './conversational';

const orchestrator = new ConversationalOrchestrator({
  intentParser,
  permissionChecker,
  responseGenerator,
  auditLogger
});

const response = await orchestrator.handleRequest({
  query: '我的 Hub Score 是多少？',
  userId: 'user123'
});

console.log(response.message);
// 输出：您 的 Hub Score 为 2.50，属于 L3 (Bot Interface) 级别。
//      您在团队中扮演重要的协作接口，连接不同成员和工作流。
```

### 生成报告

```typescript
import { ReportTemplate } from './conversational';

const template = new ReportTemplate();
const html = await template.renderPersonalReport({
  userName: '张三',
  timeRange: '2026-03-01 至 2026-03-31',
  language: 'zh',
  metrics: [...],
  connections: [...],
  ranking: [...]
});

// 保存为 HTML 文件
await fs.writeFile('report.html', html);
```

### 发送到 DMWork

```typescript
import { DMWorkIntegration } from './conversational';

const dmwork = new DMWorkIntegration({
  botToken: process.env.DMWORK_BOT_TOKEN!
});

await dmwork.sendMessage({
  channelId: 'user123',
  channelType: 1,
  message: '📊 您的分析报告已生成',
  attachmentPath: '/tmp/report.html'
});
```

## 数据库表

### conversational_query_logs

```sql
CREATE TABLE conversational_query_logs (
  id VARCHAR(36) PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  query TEXT NOT NULL,
  intent VARCHAR(50) NOT NULL,
  success TINYINT(1) NOT NULL,
  execution_time_ms INT NOT NULL,
  error TEXT,
  INDEX idx_user_time (user_id, timestamp),
  INDEX idx_timestamp (timestamp)
);
```

## 配置

### DMWork Bot Token

```bash
# 1. 从 BotFather 获取 bot_token
export DMWORK_BOT_TOKEN=bf_xxxxx

# 2. 配置到 openclaw.json
{
  "channels": {
    "dmwork": {
      "botToken": "bf_xxxxx",
      "apiUrl": "https://example.com/api"
    }
  }
}
```

### 权限配置

```sql
-- 为用户添加 Bot 所有权
INSERT INTO user_bot_ownership (user_id, bot_id)
VALUES ('user123', 'Bot1');
```

## 测试

```bash
# 运行所有测试
npm test tests/layer7/conversational/

# 单独测试各模块
npm test tests/layer7/conversational/intent-parser.test.ts
npm test tests/layer7/conversational/permission-checker.test.ts
npm test tests/layer7/conversational/orchestrator.test.ts
npm test tests/layer7/conversational/response-generator.test.ts
npm test tests/layer7/conversational/report-template.test.ts
npm test tests/layer7/conversational/dmwork-integration.test.ts
```

## 性能优化

- **意图解析**：规则缓存（rules.yaml）
- **权限检查**：数据库查询优化（索引）
- **审计日志**：异步写入（不阻塞主流程）
- **文件上传**：流式上传（避免内存占用）

## 安全考虑

- **权限验证**：严格的 self + owned_bots 控制
- **SQL 注入**：使用参数化查询
- **文件上传**：
  - 大小限制（100MB）
  - 类型检查（扩展名白名单）
- **API Token**：
  - 从环境变量读取
  - 不记录到日志
  - 不在代码中硬编码

## 扩展性

- **新增意图**：在 `rules.yaml` 添加规则
- **新增 v2.0 API**：在 Orchestrator 中注入调用函数
- **新增报告模板**：创建新的 `.html` 文件
- **新增消息平台**：实现类似 DMWorkIntegration 的接口

## License

MIT
