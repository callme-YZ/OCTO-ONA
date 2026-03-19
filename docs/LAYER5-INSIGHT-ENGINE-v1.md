# OCTO-ONA Layer 5 洞察引擎设计 v1.0

**更新时间**: 2026-03-19  
**设计原则**: 从指标到洞察 - 诊断问题 + 提出建议

---

## 一、总览

### 核心功能

```
Layer 4指标数据
   ↓
诊断规则库（识别问题）
   ↓
洞察生成器（分析原因）
   ↓
建议生成器（行动建议）
   ↓
报告输出（结构化洞察）
```

### 设计目标

1. **可解释性** — 每个洞察都有清晰的依据
2. **可操作性** — 每个建议都是具体的行动
3. **可扩展性** — 规则库易于增加和修改
4. **优先级** — 区分严重/警告/建议

---

## 二、诊断规则库

### 规则结构

```python
from pydantic import BaseModel
from typing import Literal, List, Callable

class DiagnosticRule(BaseModel):
    """
    诊断规则
    """
    id: str  # 规则ID，如 "BURNOUT_HIGH"
    name: str  # 规则名称
    category: Literal["network", "bot", "connoisseurship", "risk"]  # 类别
    severity: Literal["critical", "warning", "info"]  # 严重程度
    
    # 触发条件（函数）
    condition: Callable[[dict], bool]  # 接收指标数据，返回是否触发
    
    # 诊断内容
    description: str  # 问题描述模板
    
    # 建议（可选）
    recommendations: List[str]  # 行动建议列表
    
    # 元数据
    related_metrics: List[str]  # 关联的指标ID
    priority: int = 0  # 优先级（数字越大越重要）
```

---

## 三、规则库详细设计

### 3.1 网络健康类规则（Network Health）

#### Rule 1: 严重孤岛 (SILO_CRITICAL)

```python
DiagnosticRule(
    id="SILO_CRITICAL",
    name="严重孤岛",
    category="network",
    severity="critical",
    condition=lambda metrics: metrics.get("silo_index", 0) > 15,
    description="孤岛指数达到 {silo_index:.1f}%，超过健康阈值（15%），存在严重的团队孤岛现象。",
    recommendations=[
        "识别孤立团队：{isolated_teams}",
        "建立跨团队Bot：在孤立团队间部署协调Bot",
        "组织跨团队活动：技术分享、联合Review",
        "检查组织结构：孤岛是否由组织架构导致"
    ],
    related_metrics=["L1.6"],
    priority=9
)
```

#### Rule 2: 网络密度过低 (DENSITY_LOW)

```python
DiagnosticRule(
    id="DENSITY_LOW",
    name="协作稀疏",
    category="network",
    severity="warning",
    condition=lambda metrics: metrics.get("network_density", 0) < 0.3,
    description="网络密度为 {network_density:.2f}，低于健康阈值（0.3），团队协作稀疏。",
    recommendations=[
        "增加协作机会：定期站会、Code Review",
        "引入协作Bot：自动触发协作流程",
        "优化沟通渠道：减少沟通摩擦"
    ],
    related_metrics=["L1.4"],
    priority=6
)
```

#### Rule 3: 领导层距离过大 (LEADERSHIP_DISTANCE_FAR)

```python
DiagnosticRule(
    id="LEADERSHIP_DISTANCE_FAR",
    name="层级过深",
    category="network",
    severity="warning",
    condition=lambda metrics: metrics.get("leadership_distance", 100) < 70,
    description="仅 {leadership_distance:.1f}% 的员工能在2步内触达决策层，低于健康阈值（70%），组织层级过深。",
    recommendations=[
        "扁平化组织：减少中间层级",
        "建立快速通道：决策层定期开放时间",
        "部署决策Bot：代理决策层回答常见问题",
        "无法2步触达的员工列表：{unreachable_employees}"
    ],
    related_metrics=["L1.5"],
    priority=7
)
```

---

### 3.2 过载风险类规则（Burnout Risk）

#### Rule 4: 过载人员过多 (BURNOUT_CRITICAL)

```python
DiagnosticRule(
    id="BURNOUT_CRITICAL",
    name="过载风险高",
    category="risk",
    severity="critical",
    condition=lambda metrics: metrics.get("burnout_risk_percentage", 0) > 5,
    description="有 {burnout_risk_count} 人（{burnout_risk_percentage:.1f}%）处于过载风险，超过健康阈值（5%）。",
    recommendations=[
        "分散职责：将过载人员的桥梁职责分散到其他人或Bot",
        "过载人员清单：{burnout_employees}（按BC值降序）",
        "部署代理Bot：为过载人员部署人类代理Bot分担任务",
        "优化流程：减少不必要的协调环节"
    ],
    related_metrics=["L1.7"],
    priority=10
)
```

#### Rule 5: 单点故障 (BOTTLENECK_CRITICAL)

```python
DiagnosticRule(
    id="BOTTLENECK_CRITICAL",
    name="单点故障风险",
    category="risk",
    severity="critical",
    condition=lambda metrics: len(metrics.get("bottleneck_nodes", [])) > 5,
    description="发现 {bottleneck_count} 个瓶颈节点，存在单点故障风险。",
    recommendations=[
        "瓶颈节点清单：{bottleneck_nodes}",
        "建立冗余连接：在瓶颈节点连接的团队间建立备用通道",
        "知识共享：瓶颈节点的知识文档化，降低依赖",
        "部署备份Bot：关键连接可由Bot备份"
    ],
    related_metrics=["L1.8"],
    priority=9
)
```

---

### 3.3 Bot效能类规则（Bot Effectiveness）

#### Rule 6: 边缘Bot过多 (BOT_UNDERUTILIZED)

```python
DiagnosticRule(
    id="BOT_UNDERUTILIZED",
    name="边缘Bot过多",
    category="bot",
    severity="warning",
    condition=lambda metrics: metrics.get("edge_bot_ratio", 0) > 0.3,
    description="有 {edge_bot_count} 个Bot（{edge_bot_ratio:.1f}%）活跃度低于P25，资源利用率低。",
    recommendations=[
        "边缘Bot清单：{edge_bots}（按活跃度排序）",
        "评估价值：这些Bot是否还需要？",
        "下线或优化：低价值Bot可以下线，或优化推广策略",
        "分析原因：为什么这些Bot不被使用？"
    ],
    related_metrics=["T5"],
    priority=4
)
```

#### Rule 7: 缺少跨团队连接Bot (BOT_NO_CROSS_TEAM)

```python
DiagnosticRule(
    id="BOT_NO_CROSS_TEAM",
    name="缺少跨团队连接Bot",
    category="bot",
    severity="warning",
    condition=lambda metrics: (
        metrics.get("silo_index", 0) > 10 and 
        len(metrics.get("cross_team_bots", [])) == 0
    ),
    description="存在孤岛问题，但没有Bot承担跨团队连接角色。",
    recommendations=[
        "部署跨团队Bot：在孤立团队间部署协调Bot",
        "升级现有Bot：赋予现有Bot跨团队协调能力",
        "建议Bot位置：{recommended_bot_positions}"
    ],
    related_metrics=["T1", "L1.6"],
    priority=7
)
```

#### Rule 8: Bot功能单一化 (BOT_LACK_DIVERSITY)

```python
DiagnosticRule(
    id="BOT_LACK_DIVERSITY",
    name="Bot功能缺乏多样性",
    category="bot",
    severity="info",
    condition=lambda metrics: (
        len(set(metrics.get("bot_tag_distribution", {}).values())) < 4
    ),
    description="Bot功能标签覆盖不足4个类别，功能单一。",
    recommendations=[
        "当前Bot标签分布：{bot_tag_distribution}",
        "建议增加：信息聚合Bot、人类代理Bot",
        "功能多样化：避免所有Bot都是执行导向"
    ],
    related_metrics=["T1-T8"],
    priority=3
)
```

---

### 3.4 品鉴价值类规则（Connoisseurship）

#### Rule 9: 品鉴被忽视 (CONNOISSEURSHIP_LOW_CONVERSION)

```python
DiagnosticRule(
    id="CONNOISSEURSHIP_LOW_CONVERSION",
    name="品鉴采纳率低",
    category="connoisseurship",
    severity="warning",
    condition=lambda metrics: metrics.get("avg_conversion_rate", 100) < 30,
    description="品鉴执行转化率仅 {avg_conversion_rate:.1f}%，低于健康阈值（30%），品鉴未被有效执行。",
    recommendations=[
        "分析原因：为什么品鉴不被采纳？",
        "优化Bot响应：Bot是否理解和执行品鉴？",
        "流程改进：品鉴→Issue→PR的流程是否通畅？",
        "低转化品鉴者：{low_conversion_connoisseurs}"
    ],
    related_metrics=["L3.3"],
    priority=6
)
```

#### Rule 10: 缺少品鉴者 (CONNOISSEURSHIP_MISSING)

```python
DiagnosticRule(
    id="CONNOISSEURSHIP_MISSING",
    name="缺少品鉴者",
    category="connoisseurship",
    severity="warning",
    condition=lambda metrics: len(metrics.get("connoisseurs", [])) < 3,
    description="仅有 {connoisseur_count} 人进行品鉴（频率>30%），缺少足够的专业判断。",
    recommendations=[
        "当前品鉴者：{connoisseurs}",
        "培养品鉴文化：鼓励团队成员主动评价和反馈",
        "明确品鉴角色：PM/Tech Lead应承担更多品鉴职责",
        "建立品鉴奖励机制"
    ],
    related_metrics=["L3.1"],
    priority=5
)
```

#### Rule 11: 品鉴影响力低 (CONNOISSEURSHIP_LOW_REACH)

```python
DiagnosticRule(
    id="CONNOISSEURSHIP_LOW_REACH",
    name="品鉴影响范围窄",
    category="connoisseurship",
    severity="info",
    condition=lambda metrics: metrics.get("avg_reach", 100) < 20,
    description="品鉴平均影响范围仅 {avg_reach:.1f}%，品鉴价值未被充分传播。",
    recommendations=[
        "扩大品鉴传播：在更多频道分享品鉴",
        "Bot转述品鉴：Bot主动引用高价值品鉴",
        "品鉴文档化：将重要品鉴沉淀为文档"
    ],
    related_metrics=["L3.2"],
    priority=4
)
```

---

### 3.5 组合规则（Composite Rules）

#### Rule 12: 协作失衡 (COLLABORATION_IMBALANCE)

```python
DiagnosticRule(
    id="COLLABORATION_IMBALANCE",
    name="人机协作失衡",
    category="bot",
    severity="warning",
    condition=lambda metrics: (
        metrics.get("h2b_ratio", 0.5) > 0.7 or 
        metrics.get("h2b_ratio", 0.5) < 0.3
    ),
    description="人→Bot消息占比 {h2b_ratio:.1%}，协作模式失衡。",
    recommendations=[
        "如果>70%：人类过度依赖Bot，缺少人-人协作",
        "如果<30%：Bot利用率低，未发挥价值",
        "建议比例：40-60%为健康范围",
        "分析Bot响应质量和人类接受度"
    ],
    related_metrics=["L2.2"],
    priority=5
)
```

#### Rule 13: 品鉴→执行断裂 (CONNOISSEURSHIP_EXECUTION_GAP)

```python
DiagnosticRule(
    id="CONNOISSEURSHIP_EXECUTION_GAP",
    name="品鉴→执行链条断裂",
    category="connoisseurship",
    severity="critical",
    condition=lambda metrics: (
        metrics.get("avg_connoisseurship_frequency", 0) > 40 and
        metrics.get("avg_conversion_rate", 100) < 20
    ),
    description="品鉴频率高（{avg_connoisseurship_frequency:.1f}%），但执行转化率低（{avg_conversion_rate:.1f}%），存在品鉴→执行断裂。",
    recommendations=[
        "诊断断裂点：品鉴是否被Bot理解？Bot是否有执行能力？",
        "优化品鉴语言：使品鉴更actionable",
        "建立品鉴→Issue自动化流程",
        "品鉴未执行案例分析：{unexecuted_connoisseurship_examples}"
    ],
    related_metrics=["L3.1", "L3.3"],
    priority=8
)
```

---

## 四、洞察生成器

### 洞察结构

```python
class Insight(BaseModel):
    """
    洞察输出
    """
    # 基础信息
    rule_id: str
    rule_name: str
    severity: Literal["critical", "warning", "info"]
    category: str
    
    # 诊断内容
    description: str  # 填充后的描述（含实际数值）
    evidence: dict  # 证据数据（相关指标值）
    
    # 建议
    recommendations: List[str]  # 填充后的建议
    
    # 优先级
    priority: int
    
    # 元数据
    timestamp: datetime
    affected_entities: List[str]  # 受影响的节点/Bot/团队
```

### 洞察生成逻辑

```python
class InsightEngine:
    def __init__(self, rules: List[DiagnosticRule]):
        self.rules = sorted(rules, key=lambda r: r.priority, reverse=True)
    
    def generate_insights(self, metrics: dict) -> List[Insight]:
        """
        从指标生成洞察
        
        Args:
            metrics: Layer 4计算的所有指标
        
        Returns:
            List[Insight]: 按优先级排序的洞察列表
        """
        insights = []
        
        for rule in self.rules:
            # 检查规则是否触发
            if rule.condition(metrics):
                # 生成洞察
                insight = self._create_insight(rule, metrics)
                insights.append(insight)
        
        return insights
    
    def _create_insight(self, rule: DiagnosticRule, metrics: dict) -> Insight:
        """
        创建单个洞察
        """
        # 填充描述模板
        description = rule.description.format(**metrics)
        
        # 填充建议模板
        recommendations = [
            rec.format(**metrics) for rec in rule.recommendations
        ]
        
        # 提取证据
        evidence = {
            metric_id: metrics.get(metric_id)
            for metric_id in rule.related_metrics
        }
        
        # 识别受影响实体
        affected = self._identify_affected_entities(rule, metrics)
        
        return Insight(
            rule_id=rule.id,
            rule_name=rule.name,
            severity=rule.severity,
            category=rule.category,
            description=description,
            evidence=evidence,
            recommendations=recommendations,
            priority=rule.priority,
            timestamp=datetime.utcnow(),
            affected_entities=affected
        )
    
    def _identify_affected_entities(self, rule: DiagnosticRule, 
                                      metrics: dict) -> List[str]:
        """
        识别受影响的实体（节点/Bot/团队）
        """
        # 根据规则类型提取相关实体
        if rule.id == "BURNOUT_CRITICAL":
            return metrics.get("burnout_employees", [])
        elif rule.id == "SILO_CRITICAL":
            return metrics.get("isolated_teams", [])
        # ... 更多规则
        return []
```

---

## 五、建议优先级排序

### 优先级算法

```python
def prioritize_insights(insights: List[Insight]) -> List[Insight]:
    """
    对洞察进行优先级排序
    
    排序规则：
    1. severity (critical > warning > info)
    2. priority (数值)
    3. 受影响实体数量
    """
    severity_weight = {
        "critical": 100,
        "warning": 50,
        "info": 10
    }
    
    def score(insight: Insight) -> tuple:
        return (
            severity_weight[insight.severity],
            insight.priority,
            len(insight.affected_entities)
        )
    
    return sorted(insights, key=score, reverse=True)
```

---

## 六、报告输出

### 报告结构

```python
class InsightReport(BaseModel):
    """
    洞察报告
    """
    # 基础信息
    report_id: str
    generated_at: datetime
    time_range: tuple  # (start, end)
    
    # 摘要
    summary: dict = {
        "total_insights": 0,
        "critical_count": 0,
        "warning_count": 0,
        "info_count": 0
    }
    
    # 洞察列表（按优先级排序）
    insights: List[Insight]
    
    # 关键发现（Top 5）
    key_findings: List[str]
    
    # 行动建议（优先级Top 10）
    action_items: List[dict]  # {"description": str, "priority": int}
    
    def to_markdown(self) -> str:
        """导出为Markdown报告"""
        pass
    
    def to_json(self) -> str:
        """导出为JSON"""
        pass
```

### 报告示例

```markdown
# OCTO-ONA 洞察报告

**生成时间**: 2026-03-19 17:15  
**分析周期**: 2026-03-01 至 2026-03-18

---

## 📊 摘要

- **总洞察数**: 8
- **严重问题**: 2
- **警告**: 4
- **建议**: 2

---

## 🚨 严重问题（Critical）

### 1. 过载风险高 (优先级: 10)

**问题**: 有 3 人（42.9%）处于过载风险，超过健康阈值（5%）。

**证据**:
- Burnout Risk: 42.9%
- 过载人员: 嘉伟(BC=0.45), 黄楠(BC=0.38), 梦林(BC=0.32)

**建议**:
1. 分散职责：将过载人员的桥梁职责分散到其他人或Bot
2. 部署代理Bot：为嘉伟、黄楠部署人类代理Bot分担任务
3. 优化流程：减少不必要的协调环节

---

### 2. 品鉴→执行链条断裂 (优先级: 8)

**问题**: 品鉴频率高（65.2%），但执行转化率低（18.3%），存在品鉴→执行断裂。

**证据**:
- 品鉴频率: 65.2%
- 执行转化率: 18.3%

**建议**:
1. 诊断断裂点：品鉴是否被Bot理解？
2. 优化品鉴语言：使品鉴更actionable
3. 建立品鉴→Issue自动化流程

---

## ⚠️ 警告（Warning）

### 3. 严重孤岛 (优先级: 9)
...

---

## 💡 行动清单（Top 5）

1. **[紧急]** 为嘉伟、黄楠部署人类代理Bot（解决过载）
2. **[紧急]** 建立品鉴→Issue自动化流程（提升转化率）
3. **[重要]** 在产品-研发团队间部署跨团队连接Bot（解决孤岛）
4. **[重要]** 下线3个边缘Bot：aoli_bot, 花花, JOJO（资源优化）
5. **[建议]** 培养更多品鉴者，当前仅2人
```

---

## 七、规则库扩展机制

### 自定义规则

```python
# 用户可以添加自定义规则
custom_rule = DiagnosticRule(
    id="CUSTOM_RULE_001",
    name="我的自定义规则",
    category="custom",
    severity="warning",
    condition=lambda m: m.get("my_metric", 0) > 100,
    description="自定义问题描述",
    recommendations=["自定义建议"],
    related_metrics=["L1.1"],
    priority=5
)

engine = InsightEngine(rules=default_rules + [custom_rule])
```

### 规则配置文件（YAML）

```yaml
rules:
  - id: SILO_CRITICAL
    name: 严重孤岛
    category: network
    severity: critical
    condition: "metrics['silo_index'] > 15"
    description: "孤岛指数达到 {silo_index:.1f}%..."
    recommendations:
      - "识别孤立团队：{isolated_teams}"
      - "建立跨团队Bot..."
    related_metrics:
      - L1.6
    priority: 9
```

---

## 八、实施优先级

### Phase 1: 核心规则（2周）

**实现规则**:
- BURNOUT_CRITICAL
- SILO_CRITICAL
- CONNOISSEURSHIP_LOW_CONVERSION

**产出**: 基础洞察报告

### Phase 2: 扩展规则（2周）

**实现规则**:
- BOT_UNDERUTILIZED
- LEADERSHIP_DISTANCE_FAR
- CONNOISSEURSHIP_MISSING

**产出**: 完整规则库

### Phase 3: 高级功能（2周）

**实现**:
- 自定义规则支持
- YAML配置
- 建议优先级智能排序

---

## 九、下一步

**Layer 5洞察引擎设计完成。**

**接下来可以**:
1. **设计Layer 6可视化** — Dashboard + 图表
2. **完善Layer 3分析引擎** — 品鉴识别细化
3. **设计Layer 1适配器接口规范**
4. **或者其他**？

---

**变更记录**:
- 2026-03-19: v1.0初始版本，定义13个核心诊断规则，洞察生成逻辑，报告输出格式
