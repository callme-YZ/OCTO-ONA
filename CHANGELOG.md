# Changelog

All notable changes to OCTO-ONA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-04-02

### Added

#### 🎯 Layer 7: Conversational ONA
- **Natural language query interface** — 用自然语言查询组织网络数据
- **5 intent types support**:
  - Metrics Query（指标查询）
  - Network Query（网络分析）
  - Ranking Query（排名查询）
  - Trend Analysis（趋势分析）
  - Report Generation（报告生成）

#### 🔐 Security & Permissions
- **Fine-grained permission control** — 用户只能查询自己和自己拥有的 Bot 数据
- **Audit logging** — 所有查询记录审计日志（`conversational_query_logs` 表）

#### 🤖 Intelligent Response
- **Natural language generation** — 自动生成友好的自然语言摘要
- **Trend descriptions** — 趋势箭头和百分比描述（↗️ +8%）
- **Smart suggestions** — 基于数据的可操作建议
- **HTML report template** — 精美的 HTML 报告（支持 i18n、响应式、打印优化）

#### 💬 Multi-turn Conversation
- **Context Manager** — 管理对话历史（最近 5 轮）
- **Pronoun resolution** — 代词消解（他/她/它 → 最后提及的用户/Bot）
- **Time range inheritance** — 时间范围自动继承上一轮查询

#### 🚀 User Experience
- **Onboarding Helper** — 首次用户引导和帮助
- **Welcome message** — 个性化欢迎消息
- **5 scenario-based entry points**:
  - 📊 个人洞察
  - 👥 团队概览
  - 🤖 Bot 监控
  - 📈 趋势追踪
  - 📝 定期报告
- **Commands support**: `/help`, `/scenarios`, `/welcome`
- **Friendly error messages** — 5 类错误的友好提示和建议

#### 🔌 Integration
- **DMWork Integration** — 消息发送和附件上传
  - Text messages
  - File attachments (up to 100MB)
  - Image attachments (auto-detect jpg/png/gif/webp)

#### 🧪 Testing
- **128 unit tests** — 100% pass rate
- **10 E2E tests** — 完整对话流程测试
- **Performance validation** — < 5s response time

### Technical Details

#### New Components
- `IntentParser` — 规则based自然语言理解（25 测试，100% 准确率）
- `PermissionChecker` — 细粒度权限控制（14 测试）
- `ConversationalOrchestrator` — 对话编排器（11 测试）
- `ResponseGenerator` — 智能响应生成（12 测试）
- `ReportTemplate` — HTML 报告模板引擎（4 测试）
- `DMWorkIntegration` — DMWork 消息集成（8 测试）
- `ContextManager` — 对话上下文管理（13 测试）
- `OnboardingHelper` — 用户引导助手（19 测试）
- `ErrorMessages` — 友好错误消息（22 测试）
- `AuditLogger` — 审计日志记录器

#### Database Schema
```sql
CREATE TABLE conversational_query_logs (
  id VARCHAR(36) PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  query TEXT NOT NULL,
  intent VARCHAR(50) NOT NULL,
  success BOOLEAN NOT NULL,
  execution_time_ms INT NOT NULL,
  error TEXT,
  INDEX idx_user_timestamp (user_id, timestamp)
);
```

#### Dependencies
- `axios` — HTTP client for DMWork API
- `form-data` — Multipart file uploads
- `yaml` — Intent rules configuration

### Documentation
- [User Guide](docs/v3.0-user-guide.md) — 完整用户指南
- [API Reference](docs/v3.0-api-reference.md) — Layer 7 API 文档

### Performance
- Intent parsing: < 100ms
- Permission check: < 50ms
- Response generation: < 200ms (text), < 1s (HTML)
- Total E2E: < 5s

### Code Statistics
- **5456 lines** of production code
- **138 tests** (128 unit + 10 E2E)
- **100% test pass rate**

---

## [2.0.0] - 2026-03-15

### Added
- Core ONA API (Layers 1-6)
- Hub Score calculation
- Network analysis
- Activity metrics
- Database schema v2.0

---

## [1.0.0] - 2026-02-01

### Added
- Initial release
- Basic ONA framework
- Database setup
- User and bot tracking

---

## Upgrade Guide

### v2.0 → v3.0

**No breaking changes** to existing Layer 1-6 APIs.

**New capabilities:**
1. **Conversational interface** — Add Layer 7 to enable natural language queries
2. **DMWork bot** — Deploy bot for user-facing conversations
3. **Audit logs** — New table `conversational_query_logs` (auto-created)

**Migration steps:**
1. Pull latest code: `git pull origin main`
2. Install dependencies: `npm install`
3. Compile TypeScript: `npm run build`
4. Update database schema (audit log table will be auto-created on first use)
5. Configure DMWork integration (optional)

**Backward compatibility:**
- All v2.0 APIs remain unchanged
- Existing code continues to work without modification
- Layer 7 is an additive feature

---

## Links
- [GitHub Repository](https://github.com/callme-YZ/OCTO-ONA)
- [Issues](https://github.com/callme-YZ/OCTO-ONA/issues)
- [Milestone v3.0.0](https://github.com/callme-YZ/OCTO-ONA/milestone/3)
