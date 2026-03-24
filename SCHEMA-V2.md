# OCTO-ONA v2.0 Database Schema

## 🎯 Design Goals

1. **数据库驱动** — 指标定义、算法、参数全部存数据库，Web UI 可配置
2. **本地数据缓存** — 离线高效分析，不依赖远程数据源连接
3. **版本化管理** — 指标演化可追溯，算法迭代有历史
4. **多数据源支持** — 统一 schema，支持 Discord/DMWork/GitHub

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Remote Data Sources                       │
│         (Discord, DMWork/WuKongIM, GitHub)                   │
└─────────────────┬───────────────────────────────────────────┘
                  │ Adapters (Extract & Transform)
                  ↓
┌─────────────────────────────────────────────────────────────┐
│              Part 1: Data Source Cache                       │
│  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐     │
│  │data_sources│→│  users  │  │ channels │  │ messages │     │
│  └──────────┘  └─────────┘  └──────────┘  └──────────┘     │
│                      ↓                                        │
│              sync_metadata (同步状态)                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────┐
│            Part 2: Metrics Metadata Engine                   │
│  ┌────────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │metric_categories│→│   metrics   │→│metric_formulas  │  │
│  └────────────────┘  └─────────────┘  └─────────────────┘  │
│                              ↓                ↓              │
│                    metric_parameters   metric_changelog     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────┐
│            Part 3: Analysis Results Cache                    │
│                  analysis_results                            │
│         (预计算结果 + 参数快照)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Part 1: Data Source Cache

### 1. `data_sources`
数据源配置（支持多个连接）

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | VARCHAR(64) PK | 数据源唯一ID | `dmwork-octo` |
| `type` | ENUM | discord / dmwork / github | `dmwork` |
| `name` | VARCHAR(255) | 数据源名称 | `OCTO Internal IM` |
| `config` | JSON | 连接配置（加密） | `{"host":"localhost",...}` |
| `created_at` | TIMESTAMP | 创建时间 | |
| `updated_at` | TIMESTAMP | 更新时间 | |

---

### 2. `users`
统一用户表（所有来源）

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `uid` | VARCHAR(128) PK | 全局用户ID | `dmwork-octo:user123` |
| `source_id` | VARCHAR(64) FK | 来源数据源 | `dmwork-octo` |
| `source_user_id` | VARCHAR(128) | 原始用户ID | `user123` |
| `name` | VARCHAR(255) | 用户名 | `小A` |
| `display_name` | VARCHAR(255) | 显示名称 | `AI研究员小A` |
| `is_bot` | BOOLEAN | 是否机器人 | `true` |
| `metadata` | JSON | 扩展字段 | `{"avatar":"..."}` |

**全局ID格式：** `{source_id}:{source_user_id}`

---

### 3. `channels`
频道/群组/仓库

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `channel_id` | VARCHAR(128) PK | 全局频道ID | `dmwork-octo:channel456` |
| `source_id` | VARCHAR(64) FK | 来源数据源 | `dmwork-octo` |
| `source_channel_id` | VARCHAR(128) | 原始频道ID | `channel456` |
| `name` | VARCHAR(255) | 频道名称 | `AI4S 讨论组` |
| `type` | ENUM | dm / group / channel / repository | `group` |
| `metadata` | JSON | 扩展字段 | `{"member_count":12}` |

**Types:**
- `dm` — 私聊
- `group` — 群组（Discord/DMWork）
- `channel` — 频道（Discord）
- `repository` — 代码仓库（GitHub）

---

### 4. `messages`
消息记录（核心表）

| Field | Type | Description |
|-------|------|-------------|
| `message_id` | VARCHAR(128) PK | 全局消息ID |
| `source_id` | VARCHAR(64) FK | 来源数据源 |
| `source_message_id` | VARCHAR(128) | 原始消息ID |
| `channel_id` | VARCHAR(128) FK | 所属频道 |
| `from_uid` | VARCHAR(128) FK | 发送者 |
| `content` | TEXT | 消息内容 |
| `timestamp` | BIGINT | Unix 时间戳（秒） |
| `reply_to_message_id` | VARCHAR(128) | 回复的消息ID |
| `reply_to_uid` | VARCHAR(128) | 回复的用户ID |
| `mentioned_uids` | JSON | @提及的用户列表 |
| `metadata` | JSON | 扩展字段（附件、Reactions） |

**Indexes:**
- `idx_timestamp` — 时间范围查询优化
- `idx_channel` — 频道消息查询
- `idx_from_uid` — 用户消息查询
- `idx_reply_to` — 回复链追踪

---

### 5. `sync_metadata`
同步状态追踪

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT PK AUTO_INCREMENT | 同步记录ID |
| `source_id` | VARCHAR(64) FK | 数据源ID |
| `last_sync_at` | TIMESTAMP | 最后同步时间 |
| `sync_status` | ENUM | success / partial / failed |
| `messages_synced` | INT | 同步消息数 |
| `users_synced` | INT | 同步用户数 |
| `channels_synced` | INT | 同步频道数 |
| `error_message` | TEXT | 错误信息 |

**用途：** 增量同步、状态监控

---

## 🔧 Part 2: Metrics Metadata Engine

### 6. `metric_categories`
指标分类

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | VARCHAR(32) PK | 分类ID | `network` |
| `name_en` | VARCHAR(128) | 英文名称 | `Network Metrics` |
| `name_zh` | VARCHAR(128) | 中文名称 | `网络指标` |
| `description` | TEXT | 分类描述 | |
| `display_order` | INT | 显示顺序 | `1` |

**预定义分类：**
- `network` — 网络指标（L1）
- `collaboration` — 协作指标（L2）
- `evolution` — 演化指标（L3）
- `advanced` — 高级指标（L4）

---

### 7. `metrics`
指标定义（核心表）

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | VARCHAR(32) PK | 指标ID | `L1.1` |
| `category_id` | VARCHAR(32) FK | 分类ID | `network` |
| `name_en` | VARCHAR(128) | 英文名称 | `Degree Centrality` |
| `name_zh` | VARCHAR(128) | 中文名称 | `度中心性` |
| `description` | TEXT | 指标描述 | `节点的连接数...` |
| `priority` | ENUM | P0 / P1 / P2 | `P0` |
| `unit` | VARCHAR(32) | 单位 | `score` / `ratio` / `count` |
| `status` | ENUM | active / deprecated / experimental | `active` |
| `version` | INT | 当前版本号 | `1` |

**Status:**
- `active` — 生产使用
- `deprecated` — 已弃用（保留历史数据）
- `experimental` — 实验中

---

### 8. `metric_formulas`
指标算法定义（支持版本化）

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | INT PK AUTO_INCREMENT | 算法ID | `1` |
| `metric_id` | VARCHAR(32) FK | 指标ID | `L1.1` |
| `version` | INT | 算法版本号 | `1` |
| `formula_type` | ENUM | graphology / custom / sql / javascript | `graphology` |
| `formula_code` | TEXT | 算法代码/函数名 | `engine.computeCentrality()` |
| `parameters` | JSON | 可调参数 | `{"damping":0.85}` |
| `is_active` | BOOLEAN | 是否激活 | `true` |
| `created_by` | VARCHAR(64) | 创建者 | `Mayo` |

**Formula Types:**
- `graphology` — 调用 graphology 内置算法
- `custom` — 自定义 TypeScript 函数
- `sql` — SQL 查询（直接查数据库）
- `javascript` — JS 表达式（简单计算）

**Example:**
```json
{
  "metric_id": "L1.1",
  "version": 1,
  "formula_type": "graphology",
  "formula_code": "degreeCentrality",
  "parameters": {}
}
```

---

### 9. `metric_parameters`
可调参数定义

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | INT PK AUTO_INCREMENT | 参数ID | `1` |
| `formula_id` | INT FK | 算法ID | `1` |
| `param_name` | VARCHAR(64) | 参数名称 | `damping` |
| `param_type` | ENUM | number / string / boolean / array / object | `number` |
| `default_value` | JSON | 默认值 | `0.85` |
| `min_value` | DECIMAL(10,2) | 最小值 | `0.0` |
| `max_value` | DECIMAL(10,2) | 最大值 | `1.0` |
| `description` | TEXT | 参数描述 | `阻尼系数` |

**Example (PageRank damping factor):**
```json
{
  "formula_id": 5,
  "param_name": "damping",
  "param_type": "number",
  "default_value": 0.85,
  "min_value": 0.0,
  "max_value": 1.0,
  "description": "PageRank 阻尼系数（通常 0.85）"
}
```

---

### 10. `metric_changelog`
指标变更历史（审计日志）

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT PK AUTO_INCREMENT | 日志ID |
| `metric_id` | VARCHAR(32) FK | 指标ID |
| `change_type` | ENUM | created / updated / deprecated / formula_changed |
| `old_value` | JSON | 变更前的值 |
| `new_value` | JSON | 变更后的值 |
| `changed_by` | VARCHAR(64) | 变更人 |
| `change_reason` | TEXT | 变更原因 |
| `created_at` | TIMESTAMP | 变更时间 |

**Example:**
```json
{
  "metric_id": "L1.1",
  "change_type": "formula_changed",
  "old_value": {"version": 1, "damping": 0.85},
  "new_value": {"version": 2, "damping": 0.90},
  "changed_by": "Mayo",
  "change_reason": "优化收敛速度"
}
```

---

## 📈 Part 3: Analysis Results Cache

### 11. `analysis_results`
分析结果缓存（含参数快照）

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT PK AUTO_INCREMENT | 结果ID |
| `source_id` | VARCHAR(64) FK | 数据源ID |
| `metric_id` | VARCHAR(32) FK | 指标ID |
| `formula_version` | INT | 算法版本号 |
| `time_range_start` | BIGINT | 分析起始时间（Unix） |
| `time_range_end` | BIGINT | 分析结束时间（Unix） |
| `channel_ids` | JSON | 分析的频道列表（NULL=全部） |
| `result` | JSON | 计算结果（节点分数、图数据） |
| `parameters` | JSON | 使用的参数值（快照） |
| `created_at` | TIMESTAMP | 计算时间 |

**Result JSON Structure:**
```json
{
  "nodes": {
    "user1": 0.85,
    "user2": 0.72,
    ...
  },
  "graph_stats": {
    "total_nodes": 12,
    "total_edges": 45
  }
}
```

**用途：**
- 避免重复计算
- 参数调优对比
- 历史趋势分析

---

## 📊 Part 4: Views (便捷查询)

### V1: `v_messages_enriched`
消息 + 用户信息关联

```sql
SELECT 
    message_id,
    from_name,
    is_bot,
    content,
    message_time,
    reply_to_uid,
    mentioned_uids
FROM v_messages_enriched
WHERE source_id = 'dmwork-octo'
  AND message_time >= '2026-01-01';
```

---

### V2: `v_channel_stats`
频道活跃度统计

```sql
SELECT 
    channel_name,
    unique_users,
    total_messages,
    last_message_at
FROM v_channel_stats
WHERE source_id = 'dmwork-octo'
ORDER BY total_messages DESC;
```

---

### V3: `v_user_stats`
用户活跃度统计

```sql
SELECT 
    name,
    is_bot,
    total_messages,
    channels_active
FROM v_user_stats
WHERE source_id = 'dmwork-octo'
  AND is_bot = FALSE
ORDER BY total_messages DESC;
```

---

### V4: `v_metrics_overview`
指标总览

```sql
SELECT 
    id,
    name_zh,
    category_name,
    priority,
    status,
    formula_count,
    latest_formula_version
FROM v_metrics_overview
WHERE status = 'active'
ORDER BY category_name, id;
```

---

### V5: `v_latest_analysis`
最新分析结果

```sql
SELECT 
    source_name,
    metric_name,
    analysis_start,
    analysis_end,
    created_at
FROM v_latest_analysis
WHERE source_id = 'dmwork-octo'
ORDER BY created_at DESC;
```

---

## 🚀 Usage Examples

### Example 1: Add New Metric

```sql
-- 1. Insert metric definition
INSERT INTO metrics (id, category_id, name_en, name_zh, priority, unit, status)
VALUES ('L1.5', 'network', 'Closeness Centrality', '接近中心性', 'P1', 'score', 'active');

-- 2. Add formula
INSERT INTO metric_formulas (metric_id, version, formula_type, formula_code, is_active)
VALUES ('L1.5', 1, 'graphology', 'closenessCentrality', TRUE);

-- 3. Log change
INSERT INTO metric_changelog (metric_id, change_type, new_value, changed_by, change_reason)
VALUES ('L1.5', 'created', '{"version":1}', 'Mayo', '新增接近中心性指标');
```

---

### Example 2: Sync Data from Remote

```typescript
// 1. Insert data source
await db.query(`
  INSERT INTO data_sources (id, type, name, config)
  VALUES ('dmwork-octo', 'dmwork', 'OCTO Internal IM', ?)
`, [JSON.stringify(config)]);

// 2. Extract & insert users
const users = await adapter.extractUsers();
for (const user of users) {
  await db.query(`
    INSERT INTO users (uid, source_id, source_user_id, name, is_bot)
    VALUES (?, ?, ?, ?, ?)
  `, [`dmwork-octo:${user.id}`, 'dmwork-octo', user.id, user.name, user.is_bot]);
}

// 3. Extract & insert messages
const messages = await adapter.extractMessages({
  startTime: lastSync,
  endTime: now
});
for (const msg of messages) {
  await db.query(`
    INSERT INTO messages (message_id, source_id, channel_id, from_uid, content, timestamp, ...)
    VALUES (?, ?, ?, ?, ?, ?, ...)
  `, [...]);
}

// 4. Record sync
await db.query(`
  INSERT INTO sync_metadata (source_id, last_sync_at, sync_status, messages_synced)
  VALUES ('dmwork-octo', NOW(), 'success', ?)
`, [messages.length]);
```

---

### Example 3: Compute Metric with Custom Parameters

```typescript
// 1. Get metric formula
const formula = await db.query(`
  SELECT * FROM metric_formulas
  WHERE metric_id = 'L1.1' AND is_active = TRUE
  ORDER BY version DESC LIMIT 1
`);

// 2. Load parameters (user overrides or defaults)
const params = {
  damping: userParams?.damping || 0.85
};

// 3. Compute metric
const result = await engine.computeMetric(formula.formula_code, params);

// 4. Cache result
await db.query(`
  INSERT INTO analysis_results (source_id, metric_id, formula_version, time_range_start, time_range_end, result, parameters)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`, ['dmwork-octo', 'L1.1', formula.version, startTime, endTime, JSON.stringify(result), JSON.stringify(params)]);
```

---

## 🔐 Security

⚠️ **Sensitive Data:**
- `data_sources.config` — 加密存储
- Config files → `.gitignore`
- Use `chmod 600` for local config files

✅ **Best Practices:**
- `octo-remote.config.json` → `.gitignore`
- `octo-ona.config.json` → `.gitignore`
- Environment variables for production

---

## 📝 Migration Path (v1.x → v2.0)

1. ✅ **Create v2.0 schema** — `schema-v2.sql`
2. ⏳ **Migrate existing metrics** — Convert hardcoded metrics to DB
3. ⏳ **Refactor adapters** — Write to local DB
4. ⏳ **Implement `LocalDatabase` class** — Abstraction layer
5. ⏳ **Update CLI** — Add `sync`, `metric add`, `metric list`
6. ⏳ **Update Web UI** — Metrics editor
7. ⏳ **Testing** — Full workflow validation

---

## 🎯 Next Steps

- [ ] Seed initial metrics (L1.1 - L4.5)
- [ ] Implement `LocalDatabase` TypeScript class
- [ ] Refactor `DMWorkAdapter` to use local DB
- [ ] CLI: `octo-ona sync dmwork-octo`
- [ ] Web UI: Metrics management page
