# OCTO-ONA Roadmap

## v1.0.0-beta ✅ (2026-03-20)

**Status:** Released

**核心功能：**
- ✅ 6-layer架构（Layer 1-6）
- ✅ 15个核心指标（13 P0 + 2 P1）
- ✅ 5个Bot功能标签（T1-T5）
- ✅ Hub Score品鉴分层（L0-L5）
- ✅ DMWorkAdapter数据适配器
- ✅ 单页HTML Dashboard可视化
- ✅ 92个测试（100%通过）
- ✅ 9879行文档（中英双语）

**性能：**
- Small (15 nodes): <0.1s (100x faster than target)
- Medium (50 nodes): ~0.03s (1000x faster)
- Large (200 nodes): ~0.02s (6000x faster)
- Memory: <30MB

**交付物：**
- TypeScript/Node.js框架
- 完整API文档
- 用户指南
- 性能基准测试
- 端到端示例

---

## v1.1.0 🚧 (计划中)

**主题：** 易用性 + 扩展性 + 深度分析

### 1. Web配置UI + 实时预览 🎨

**目标：** 降低技术门槛，让非开发者也能使用

**功能：**
- ✨ 数据源连接向导
  - 表单式配置（host/database/credentials）
  - 连接测试（实时验证）
  - 配置保存/加载
  
- ✨ 主题过滤器
  - 关键词输入（支持正则）
  - 频道/用户多选
  - 时间范围选择器
  
- ✨ 实时预览
  - 节点数统计
  - 消息数统计
  - 时间范围验证
  - 预估分析时间
  
- ✨ 一键运行
  - 生成配置文件（config.yaml）
  - 生成运行脚本（run.ts）
  - 执行并显示进度

**技术栈：**
- 前端：HTML + Vanilla JS（零依赖）
- 后端：Express.js（轻量API）
- 通信：REST API

**验收标准：**
- 非技术用户能在5分钟内完成配置
- 实时预览延迟<2秒
- 生成的脚本可直接运行

---

### 2. 更多适配器 🔌

**目标：** 支持主流协作平台

**新增适配器：**

#### 2.1 SlackAdapter
```typescript
class SlackAdapter extends BaseAdapter {
  // Slack Bot Token authentication
  // Channel messages extraction
  // User/Bot mapping
}
```
**数据源：** Slack API  
**覆盖场景：** 海外团队协作

#### 2.2 DiscordAdapter
```typescript
class DiscordAdapter extends BaseAdapter {
  // Discord Bot/User Token
  // Guild/Channel messages
  // Thread support
}
```
**数据源：** Discord API  
**覆盖场景：** 开源社区/游戏团队

#### 2.3 GitHubAdapter
```typescript
class GitHubAdapter extends BaseAdapter {
  // GitHub API (Issues/PRs/Comments)
  // Contributor network
  // Code review interactions
}
```
**数据源：** GitHub GraphQL API  
**覆盖场景：** 开源项目ONA

#### 2.4 TeamsAdapter
```typescript
class TeamsAdapter extends BaseAdapter {
  // Microsoft Graph API
  // Teams/Channels messages
  // Meeting participants
}
```
**数据源：** Microsoft Graph API  
**覆盖场景：** 企业协作（Microsoft生态）

**验收标准：**
- 每个Adapter通过10+测试
- 文档完整（连接配置 + 示例）
- 与BaseAdapter接口100%兼容

---

### 3. 导出格式扩展 📊

**目标：** 多样化输出，满足不同使用场景

**新增导出格式：**

#### 3.1 PDF报告生成
```typescript
class PDFExporter {
  generate(graph: NetworkGraph, metrics: MetricResult[]): Promise<Buffer>;
}
```
**内容：**
- 封面（项目名/时间/摘要）
- 网络概览（节点/边统计）
- 核心指标表格
- 可视化图表（嵌入PNG）
- 品鉴金字塔分析
- 建议与结论

**技术：** puppeteer（HTML→PDF）

#### 3.2 Excel指标导出
```typescript
class ExcelExporter {
  export(metrics: MetricResult[]): Promise<Buffer>;
}
```
**内容：**
- Sheet 1: 节点指标（Hub Score/Centrality）
- Sheet 2: 边统计（H2H/H2B/B2H/B2B）
- Sheet 3: Bot标签明细
- Sheet 4: 品鉴行为列表

**技术：** exceljs

#### 3.3 PNG网络图导出
```typescript
class ImageExporter {
  exportNetworkGraph(graph: NetworkGraph): Promise<Buffer>;
}
```
**内容：**
- 静态网络图（节点+边）
- 品鉴金字塔可视化
- Hub Score排名图

**技术：** ECharts server-side rendering

#### 3.4 JSON API
```typescript
class APIServer {
  // RESTful endpoints
  GET /api/v1/graph/:id
  GET /api/v1/metrics/:id
  GET /api/v1/dashboard/:id
}
```
**功能：**
- 查询网络数据
- 获取指标结果
- 嵌入式Dashboard

**技术：** Express.js

**验收标准：**
- PDF报告美观（专业排版）
- Excel可用于数据透视
- PNG图片高分辨率（≥1920px）
- API文档完整（Swagger/OpenAPI）

---

### 4. 对比分析 + 趋势分析 📈

**目标：** 深度洞察，发现变化与异常

**功能：**

#### 4.1 对比分析
```typescript
class ComparisonAnalyzer {
  compare(graphs: NetworkGraph[]): ComparisonReport;
}
```
**支持对比维度：**
- ⏰ 时间段对比（本月 vs 上月）
- 👥 团队对比（产品 vs 工程）
- 🎯 主题对比（短剧 vs 电商）
- 🤖 Bot版本对比（v1 vs v2）

**输出：**
- 指标变化率（↑↓百分比）
- 新增/消失节点
- 连接模式变化
- Hub Score变化排名

#### 4.2 趋势分析
```typescript
class TrendAnalyzer {
  analyzeTrend(timeSeriesGraphs: NetworkGraph[]): TrendReport;
}
```
**分析内容：**
- 📊 Hub Score趋势曲线
- 🌐 网络密度变化
- 🤖 Bot活跃度趋势
- 🏆 品鉴频率变化

**预测能力：**
- 线性回归预测未来Hub Score
- 异常检测（突然下降/上升）

#### 4.3 健康度监控
```typescript
class HealthMonitor {
  detectAnomalies(graph: NetworkGraph): HealthReport;
}
```
**检测项：**
- ⚠️ 孤岛节点（度数=0）
- 🔥 过载风险（Hub Score过低+高消息量）
- 🚨 品鉴缺失（核心成员Hub Score下降）
- 💔 团队割裂（跨团队连接减少）

**输出：**
- 健康评分（0-100）
- 风险等级（低/中/高）
- 改进建议

#### 4.4 推荐系统
```typescript
class Recommender {
  suggestMentions(userId: string, graph: NetworkGraph): string[];
}
```
**功能：**
- 基于Hub Score推荐应该@的人
- 基于网络结构推荐协作对象
- 基于品鉴行为推荐专家

**验收标准：**
- 对比报告支持≥2个维度
- 趋势分析支持≥3个时间点
- 健康度检测准确率≥80%
- 推荐系统Top-5命中率≥60%

---

## v1.1 开发计划

### Phase 1: Web UI (预计2周)
- Week 1: UI设计 + 前端实现
- Week 2: 后端API + 集成测试

### Phase 2: 新适配器 (预计2周)
- Week 1: Slack + Discord
- Week 2: GitHub + Teams

### Phase 3: 导出扩展 (预计1周)
- Day 1-2: PDF导出
- Day 3-4: Excel导出
- Day 5: PNG + API

### Phase 4: 分析增强 (预计2周)
- Week 1: 对比分析 + 趋势分析
- Week 2: 健康监控 + 推荐系统

**总计：7周（约1.5个月）**

---

## v1.2.0 🔮 (未来规划)

**候选功能：**
- LLM增强品鉴检测（Qwen2.5集成）
- 实时监控Dashboard（WebSocket）
- 移动端Dashboard（响应式优化）
- 多语言支持（日语/韩语）
- 企业版功能（权限管理/数据加密）

---

## 贡献指南

欢迎贡献！优先级：
1. ⭐ 新适配器（其他平台）
2. 📊 新可视化（创新图表）
3. 🧪 测试用例（提高覆盖率）
4. 📝 文档改进（翻译/示例）

---

**最后更新：** 2026-03-20  
**维护者：** Mayo, ∞, YZ
