# OCTO-ONA 架构设计

## 系统架构

```
┌─────────────────────────────────────┐
│        OpenClaw Agent (∞)          │
├─────────────────────────────────────┤
│  memory_search → OCTO-ONA Query     │
│  task_spawn    → Workflow Engine    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         OCTO-ONA Core               │
├─────────────────────────────────────┤
│  Query Engine  │  Inference Engine  │
│  CRUD API      │  Workflow Planner  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Knowledge Graph Store         │
├─────────────────────────────────────┤
│  Entities: Person, Project, Task... │
│  Relations: worksOn, dependsOn...   │
│  Constraints: Types, Cardinality    │
└─────────────────────────────────────┘
```

## 核心组件

### 1. 本体层（Ontology Layer）

**实体类型（Entity Types）**:
- `Person` — 人员（YZ, Joy, ∞, 小A, 小P, 小E）
- `Project` — 项目（fusion-ai4s, PyTearRL, OCTO-ONA）
- `Task` — 任务（research, implement, review）
- `Concept` — 概念（MHD, RL, structure-preserving）
- `Event` — 事件（会议、决策、里程碑）
- `Document` — 文档（报告、论文、笔记）

**关系类型（Relations）**:
- `worksOn(Person, Project)` — 参与项目
- `owns(Person, Project)` — 负责项目
- `dependsOn(Task, Task)` — 任务依赖
- `related(Concept, Concept)` — 概念关联
- `references(Document, Concept)` — 文档引用
- `milestone(Project, Event)` — 项目里程碑

**约束规则（Constraints）**:
- `owns` 关系 1:N（一个项目一个负责人）
- `dependsOn` 不能循环
- `worksOn` 需要时间范围

### 2. 数据层（Data Layer）

**存储方案（待选）**:

**Option A: JSON 文件（简单）**
```json
{
  "entities": {
    "yz": {"type": "Person", "name": "YZ", "role": "决策者"},
    "fusion-ai4s": {"type": "Project", "name": "Fusion AI4S"}
  },
  "relations": [
    {"type": "owns", "from": "yz", "to": "fusion-ai4s"}
  ]
}
```

**Option B: SQLite（高效）**
```sql
CREATE TABLE entities (id TEXT PRIMARY KEY, type TEXT, data JSON);
CREATE TABLE relations (id INTEGER PRIMARY KEY, type TEXT, from_id TEXT, to_id TEXT, data JSON);
```

**Option C: RDF + Triple Store（标准）**
```turtle
@prefix octo: <http://octo-ona.ai#> .
octo:yz a octo:Person ; octo:name "YZ" .
octo:fusion-ai4s a octo:Project .
octo:yz octo:owns octo:fusion-ai4s .
```

### 3. 查询层（Query Layer）

**接口设计**:
```python
class OctoOna:
    def search(query: str) -> List[Entity]
    def get(entity_id: str) -> Entity
    def related(entity_id: str, relation: str) -> List[Entity]
    def path(from_id: str, to_id: str) -> List[Relation]
```

**查询示例**:
```python
# 语义搜索
ona.search("MHD tearing mode control")

# 关系查询
ona.related("yz", "worksOn")  # YZ 参与的项目

# 路径查询
ona.path("小A", "PyTearRL")  # 小A 如何参与 PyTearRL
```

### 4. 推理层（Inference Layer）

**规则推理**:
- 传递性：`worksOn(A, P1) ∧ partOf(P1, P2) → worksOn(A, P2)`
- 隐含关系：`implements(T, C) ∧ uses(C, D) → needs(T, D)`

**任务编排**:
```python
def plan_task(goal: str) -> Workflow:
    # 1. 分解目标为子任务
    # 2. 查询依赖关系
    # 3. 推理执行顺序
    # 4. 分配负责人
    return workflow
```

## 数据迁移

### MEMORY.md → OCTO-ONA

**当前问题**:
- MEMORY.md 是扁平文本
- 难以表达复杂关系
- 检索效率低

**迁移策略**:
1. 解析 MEMORY.md，提取实体和事件
2. 建立关系网络
3. 补充约束和元数据
4. 验证完整性

**示例**:
```markdown
## 2026-03-01 战略转向：MHD + 保结构 + RL
```
→
```python
{
  "event": {"id": "event-20260301", "type": "Decision", "date": "2026-03-01"},
  "decision": {"topic": "战略转向", "choice": "MHD + 保结构 + RL"},
  "participants": ["yz", "joy", "infinity", "xiaoa", "xiaop"],
  "impact": ["project:fusion-ai4s", "project:pytearrl"]
}
```

## 集成计划

### OpenClaw Skill 接口

```python
# ~/.openclaw/skills/octo-ona/SKILL.md

def memory_search(query: str) -> str:
    results = ona.search(query)
    return format_results(results)

def task_plan(goal: str) -> str:
    workflow = ona.plan_task(goal)
    return format_workflow(workflow)
```

### 替换现有 memory_search

```diff
- memory_search → 文本检索 MEMORY.md
+ memory_search → 语义检索 OCTO-ONA
```

## 性能指标

- **查询延迟**: < 100ms（本地）
- **数据规模**: 支持 10k+ 实体
- **推理深度**: ≤ 5 层关系

## 开发优先级

1. **Phase 1** (本周): 本体设计 + JSON 存储
2. **Phase 2** (下周): CRUD API + 基本查询
3. **Phase 3** (两周后): 推理引擎 + 数据迁移
4. **Phase 4** (三周后): OpenClaw 集成

---

_Last Updated: 2026-03-17_
