# OCTO-ONA 本体定义

## 核心实体类型

### Person（人员）

**属性**:
- `id`: 唯一标识
- `name`: 姓名
- `role`: 角色（决策者、研究员、协调者）
- `emoji`: 标识符号
- `skills`: 技能列表

**实例**:
```json
{
  "id": "yz",
  "type": "Person",
  "name": "YZ",
  "role": "决策者",
  "emoji": "🐙",
  "skills": ["战略规划", "核聚变物理"]
}
```

### Project（项目）

**属性**:
- `id`: 项目ID
- `name`: 项目名称
- `status`: 状态（active, paused, completed）
- `owner`: 负责人
- `start_date`: 开始日期
- `goal`: 目标描述

**实例**:
```json
{
  "id": "pytearrl",
  "type": "Project",
  "name": "PyTearRL",
  "status": "active",
  "owner": "xiaoa",
  "start_date": "2026-03-01",
  "goal": "Tearing mode RL control with structure-preserving"
}
```

### Task（任务）

**属性**:
- `id`: 任务ID
- `title`: 标题
- `status`: 状态（todo, in_progress, done, blocked）
- `assignee`: 执行人
- `dependencies`: 依赖任务列表
- `deadline`: 截止日期

**实例**:
```json
{
  "id": "task-mhd-impl",
  "type": "Task",
  "title": "实现完整 MHD 环境",
  "status": "done",
  "assignee": "xiaop",
  "dependencies": ["task-mhd-theory"],
  "completion_date": "2026-03-02"
}
```

### Concept（概念）

**属性**:
- `id`: 概念ID
- `name`: 概念名称
- `category`: 分类（physics, algorithm, tool）
- `definition`: 定义
- `references`: 参考文献

**实例**:
```json
{
  "id": "concept-tearing-mode",
  "type": "Concept",
  "name": "Tearing Mode",
  "category": "physics",
  "definition": "MHD 不稳定性，磁力线重联导致磁岛增长",
  "references": ["Furth1963", "PyTearRL-doc"]
}
```

### Event（事件）

**属性**:
- `id`: 事件ID
- `type`: 类型（decision, milestone, meeting, error）
- `date`: 日期时间
- `participants`: 参与者列表
- `description`: 描述
- `impact`: 影响范围

**实例**:
```json
{
  "id": "event-20260301-strategic-shift",
  "type": "Event",
  "event_type": "decision",
  "date": "2026-03-01T10:00:00+08:00",
  "participants": ["yz", "joy", "infinity", "xiaoa", "xiaop"],
  "description": "战略转向：MHD + 保结构 + RL",
  "impact": ["project:fusion-ai4s", "project:pytearrl"]
}
```

### Document（文档）

**属性**:
- `id`: 文档ID
- `title`: 标题
- `type`: 类型（report, paper, note, code）
- `path`: 文件路径
- `author`: 作者
- `created`: 创建日期
- `topics`: 主题标签

**实例**:
```json
{
  "id": "doc-stage0-summary",
  "type": "Document",
  "doc_type": "report",
  "title": "Stage 0 Summary Report",
  "path": "reports/Stage0_Summary.md",
  "author": "infinity",
  "created": "2026-03-04",
  "topics": ["PIC", "TORAX", "structure-preserving"]
}
```

## 核心关系类型

### worksOn（参与项目）

```python
worksOn: Person × Project → WorksOn
```

**属性**:
- `role`: 角色（owner, contributor, reviewer）
- `start_date`: 开始日期
- `end_date`: 结束日期（可选）

**实例**:
```json
{
  "type": "worksOn",
  "from": "xiaoa",
  "to": "pytearrl",
  "role": "owner",
  "start_date": "2026-03-01"
}
```

### dependsOn（任务依赖）

```python
dependsOn: Task × Task → DependsOn
```

**约束**:
- 不能循环依赖
- 传递性

**实例**:
```json
{
  "type": "dependsOn",
  "from": "task-rl-train",
  "to": "task-mhd-impl",
  "dependency_type": "blocking"
}
```

### related（概念关联）

```python
related: Concept × Concept → Related
```

**属性**:
- `relation_type`: 关系类型（uses, implements, extends）

**实例**:
```json
{
  "type": "related",
  "from": "concept-symplectic-integrator",
  "to": "concept-boris-algorithm",
  "relation_type": "implements"
}
```

### references（文档引用）

```python
references: Document × (Concept | Project | Event) → References
```

**实例**:
```json
{
  "type": "references",
  "from": "doc-stage0-summary",
  "to": "concept-boris-algorithm"
}
```

### milestone（项目里程碑）

```python
milestone: Project × Event → Milestone
```

**实例**:
```json
{
  "type": "milestone",
  "from": "pytearrl",
  "to": "event-20260304-stage0-delivery",
  "status": "completed"
}
```

## 约束规则

### 实体约束

1. **Person**:
   - `id` 必须唯一
   - `role` ∈ {决策者, 研究员, 协调者, 文档管理员}

2. **Project**:
   - `owner` 必须是 Person
   - `status` ∈ {active, paused, completed, archived}

3. **Task**:
   - `assignee` 必须是 Person
   - `status` ∈ {todo, in_progress, done, blocked}
   - `dependencies` 不能形成环

### 关系约束

1. **worksOn**:
   - 一个 Project 只能有一个 owner
   - 可以有多个 contributor

2. **dependsOn**:
   - 不允许循环依赖（通过拓扑排序检查）
   - 传递性：A depends B, B depends C ⇒ A depends C

3. **milestone**:
   - Event.type 必须是 "milestone"
   - 同一 milestone 不能重复关联

## 推理规则

### 传递性推理

```
worksOn(Person, Project1) ∧ partOf(Project1, Project2) 
→ contributesTo(Person, Project2)
```

### 技能推断

```
implements(Task, Concept) ∧ requires(Concept, Skill)
→ needs(Task, Skill)
```

### 阻塞状态传播

```
dependsOn(TaskA, TaskB) ∧ status(TaskB, blocked)
→ status(TaskA, blocked)
```

## 扩展性

### 自定义实体类型

用户可以定义新的实体类型，继承基类：

```json
{
  "id": "custom-tool",
  "type": "Tool",
  "extends": "Entity",
  "attributes": {
    "name": "string",
    "version": "string",
    "language": "string"
  }
}
```

### 自定义关系

```json
{
  "type": "uses",
  "extends": "Relation",
  "from_type": "Project",
  "to_type": "Tool"
}
```

---

_Last Updated: 2026-03-17_
