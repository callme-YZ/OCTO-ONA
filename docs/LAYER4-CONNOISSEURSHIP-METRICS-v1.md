# OCTO-ONA L3品鉴价值指标算法规范 v1.0

**更新时间**: 2026-03-19  
**核心原则**: 量化品鉴影响力，而非品鉴质量

---

## 一、总览

### L3品鉴指标清单

| ID | 指标名称 | 英文 | 核心测量 | 优先级 |
|----|---------|------|---------|--------|
| L3.1 | 品鉴行为频率 | Connoisseurship Frequency | 品鉴占比 | P0 |
| L3.2 | 品鉴影响广度 | Connoisseurship Reach | 触达节点数 | P0 |
| L3.3 | 品鉴执行转化 | Connoisseurship Conversion | 执行比例 | P0 |
| L3.4 | 品鉴网络放大 | Connoisseurship Amplification | 传播次数 | P1 |
| **L3.5** | **Hub Score** 🆕 | **Hub Score** | **影响力比率** | **P0** |

### 设计理念

**核心思想**:
- **不评判品鉴质量**（主观的，无法客观测量）
- **测量品鉴影响**（客观的，基于网络数据）

**影响力 = 市场验证**:
- 频率高 → 持续输出判断
- 影响广 → 触达更多节点
- 转化高 → 判断被执行
- 放大强 → 判断被传播

---

## 二、核心前提：品鉴行为识别

### 什么是品鉴？

**基于Octo分析的定义**:

> 品鉴 = 人在与AI/人对话中的专业判断、评价、引导和决策

### 品鉴的4个维度（刘乐君案例）

1. **UI/UX评价** — "排版有问题"、"UI不好看"
2. **功能需求** — "我有一个需求"
3. **竞品对比** — "没有飞书好用"
4. **价值质疑** — "产品优势是什么"

### 品鉴的语言特征

#### 1. **评价性语言**
```python
evaluation_keywords = [
    "感觉", "觉得", "不对", "有问题",
    "不错", "很好", "太X了", "应该", "不应该"
]
```

#### 2. **批判性语言**
```python
critical_keywords = [
    "为什么", "怎么", "质疑", "不理解",
    "有疑问", "不合理", "说不通"
]
```

#### 3. **对比性语言**
```python
comparative_keywords = [
    "比", "相比", "对比", "没有X好",
    "不如", "优于", "逊于", "参考", "借鉴"
]
```

#### 4. **品味性语言**
```python
taste_keywords = [
    "美感", "优雅", "简洁", "复杂", "直观",
    "自然", "别扭", "顺畅", "流畅", "生硬"
]
```

### 品鉴识别算法（规则式，Phase 1）

```python
def is_connoisseurship_message(message: str) -> bool:
    """
    判断消息是否为品鉴行为（规则式）
    
    Args:
        message: 消息文本
    
    Returns:
        bool: 是否为品鉴消息
    """
    score = 0
    
    # 评价性语言：+1
    if contains_any(message, evaluation_keywords):
        score += 1
    
    # 批判性语言：+1
    if contains_any(message, critical_keywords):
        score += 1
    
    # 对比性语言：+1
    if contains_any(message, comparative_keywords):
        score += 1
    
    # 品味性语言：+2（权重更高）
    if contains_any(message, taste_keywords):
        score += 2
    
    # 阈值：得分>=2视为品鉴
    return score >= 2


def contains_any(text: str, keywords: List[str]) -> bool:
    """
    检查文本是否包含任意关键词
    """
    return any(keyword in text for keyword in keywords)
```

### 品鉴识别算法（LLM增强，Phase 2可选）

```python
def is_connoisseurship_message_llm(message: str) -> bool:
    """
    判断消息是否为品鉴行为（LLM增强）
    
    Args:
        message: 消息文本
    
    Returns:
        bool: 是否为品鉴消息
    """
    prompt = f"""
判断以下消息是否为"品鉴"（专业判断/评价/引导/决策）。

品鉴特征：
1. 评价性：感觉不对、很好、应该
2. 批判性：为什么、怎么、质疑
3. 对比性：比X好、没有Y好用
4. 品味性：优雅、简洁、别扭

非品鉴：
- 纯信息通知："会议改时间了"
- 纯协调工作："请帮忙看一下"
- 闲聊："中午吃什么"

消息：{message}

输出：是/否
"""
    
    response = call_llm(prompt)
    return response.strip() == "是"
```

### 实施建议

**Phase 1（快速原型）**:
- 使用规则式算法
- 基于Octo数据手动标注100条验证准确率
- 如果准确率>70%，规则式可用

**Phase 2（可选增强）**:
- 如果规则式<70%准确率，引入LLM
- Few-shot learning（给5-10个品鉴示例）
- 批量判断降低API调用成本

---

## 三、L3.1 品鉴行为频率 (Connoisseurship Frequency)

### 定义

**节点的品鉴消息占其总消息的比例，衡量品鉴活跃度**

### 公式

```
CF(v) = Count(品鉴消息) / Count(总消息) × 100%
```

### 值域

[0, 100%]，值越高越多时间在品鉴

### 业务含义

- **高CF (>60%)**: 品鉴者角色（如刘乐君，主动品鉴）
- **中CF (30-60%)**: 混合角色（既品鉴又执行）
- **低CF (<30%)**: 执行者角色（较少品鉴）

### 算法实现

```python
def calculate_connoisseurship_frequency(node_id: str, 
                                         messages: List[Message]) -> float:
    """
    计算节点的品鉴行为频率
    
    Args:
        node_id: 节点ID
        messages: 所有消息列表
    
    Returns:
        float: 品鉴频率 [0, 100]
    """
    # 1. 筛选该节点发送的消息
    node_messages = [msg for msg in messages if msg.from_uid == node_id]
    
    if len(node_messages) == 0:
        return 0.0
    
    # 2. 识别品鉴消息
    connoisseurship_count = 0
    for msg in node_messages:
        if is_connoisseurship_message(msg.content):
            connoisseurship_count += 1
    
    # 3. 计算比例
    cf = (connoisseurship_count / len(node_messages)) * 100
    return cf


def get_top_connoisseurs_by_frequency(messages: List[Message], 
                                        top_n: int = 10) -> List[Tuple[str, float]]:
    """
    获取品鉴频率Top N节点
    
    Args:
        messages: 所有消息列表
        top_n: 返回前N个节点
    
    Returns:
        List[Tuple[str, float]]: [(node_id, cf_score), ...]
    """
    # 统计各节点的CF
    node_ids = set(msg.from_uid for msg in messages)
    cf_scores = {}
    
    for node_id in node_ids:
        cf_scores[node_id] = calculate_connoisseurship_frequency(node_id, messages)
    
    # 排序
    sorted_nodes = sorted(cf_scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_nodes[:top_n]
```

### 数据需求

**消息数据**:
- `message.from_uid`: str
- `message.content`: str（需要文本）

**品鉴识别**:
- 规则式关键词库
- 或LLM API

### 健康范围

**组织层面**:
- 5-10%的人CF > 60%（品鉴者）
- 80-90%的人CF < 30%（执行者）

**个人层面**:
- 产品经理: CF = 50-70%
- 技术Leader: CF = 30-50%
- 执行工程师: CF < 20%

### 可视化

1. **条形图**: Top 10 CF节点
2. **散点图**: X=发消息数, Y=品鉴消息数
3. **分布图**: CF值分布直方图

---

## 四、L3.2 品鉴影响广度 (Connoisseurship Reach)

### 定义

**节点的品鉴消息触达的节点数占网络总节点的比例，衡量品鉴影响范围**

### 公式

```
CR(v) = |触达节点集合| / |网络总节点| × 100%
```

触达节点包括：
1. 直接@的节点
2. 同频道/同会话的节点
3. 后续响应的节点

### 值域

[0, 100%]，值越高影响越广

### 业务含义

- **高CR (>50%)**: 组织级影响（如黄楠，被广泛提及）
- **中CR (20-50%)**: 团队级影响
- **低CR (<20%)**: 局部影响

### 算法实现

```python
def calculate_connoisseurship_reach(node_id: str, 
                                     messages: List[Message],
                                     graph: nx.Graph) -> float:
    """
    计算节点的品鉴影响广度
    
    Args:
        node_id: 节点ID
        messages: 所有消息列表
        graph: 网络图
    
    Returns:
        float: 品鉴影响广度 [0, 100]
    """
    # 1. 筛选该节点的品鉴消息
    connoisseurship_messages = [
        msg for msg in messages 
        if msg.from_uid == node_id and is_connoisseurship_message(msg.content)
    ]
    
    if len(connoisseurship_messages) == 0:
        return 0.0
    
    # 2. 收集所有触达的节点
    reached_nodes = set()
    
    for msg in connoisseurship_messages:
        # 方式1: 直接@的节点
        reached_nodes.update(msg.mentions)
        
        # 方式2: 同频道的所有节点
        if msg.channel_id:
            channel_members = get_channel_members(msg.channel_id, graph)
            reached_nodes.update(channel_members)
        
        # 方式3: 后续响应的节点（30分钟内）
        responders = get_responders_within_window(msg, messages, window_minutes=30)
        reached_nodes.update(responders)
    
    # 3. 排除自己
    reached_nodes.discard(node_id)
    
    # 4. 计算比例
    total_nodes = graph.number_of_nodes()
    cr = (len(reached_nodes) / total_nodes) * 100
    return cr


def get_channel_members(channel_id: str, graph: nx.Graph) -> Set[str]:
    """
    获取频道内的所有成员节点
    """
    # 根据图结构或元数据获取
    # 简化实现：返回空集（需要实际数据支持）
    return set()


def get_responders_within_window(original_msg: Message, 
                                   messages: List[Message],
                                   window_minutes: int = 30) -> Set[str]:
    """
    获取在时间窗口内响应的节点
    
    Args:
        original_msg: 原始品鉴消息
        messages: 所有消息列表
        window_minutes: 时间窗口（分钟）
    
    Returns:
        Set[str]: 响应者节点ID集合
    """
    from datetime import timedelta
    
    responders = set()
    window_end = original_msg.timestamp + timedelta(minutes=window_minutes)
    
    for msg in messages:
        # 同频道 + 时间窗口内
        if (msg.channel_id == original_msg.channel_id and
            original_msg.timestamp < msg.timestamp <= window_end):
            responders.add(msg.from_uid)
    
    return responders
```

### 数据需求

**消息数据**:
- `message.mentions`: List[str]（@的节点）
- `message.channel_id`: str（频道/群组）
- `message.timestamp`: datetime

**图结构**:
- 频道成员信息（可选）

### 健康范围

**组织层面**:
- 决策层: CR > 70%（影响全组织）
- 中层: CR = 30-60%（影响部门）
- 基层: CR < 30%（影响团队）

### 可视化

1. **热力图**: 品鉴者→触达节点的影响矩阵
2. **网络图**: 品鉴消息的传播路径
3. **桑基图**: 品鉴者→频道→触达节点

---

## 五、L3.3 品鉴执行转化 (Connoisseurship Conversion)

### 定义

**品鉴消息后有执行行为的比例，衡量品鉴的采纳率**

### 公式

```
CC(v) = Count(有执行的品鉴) / Count(品鉴总数) × 100%
```

执行包括：
1. Bot响应（30分钟内）
2. Issue创建（1天内）
3. PR提交（3天内）
4. 人类执行动作（需定义）

### 值域

[0, 100%]，值越高执行转化越强

### 业务含义

- **高CC (>60%)**: 品鉴被高度采纳
- **中CC (30-60%)**: 部分采纳
- **低CC (<30%)**: 采纳率低，可能品鉴不够actionable

### 算法实现

```python
def calculate_connoisseurship_conversion(node_id: str,
                                          messages: List[Message],
                                          bot_ids: List[str],
                                          issues: List[Issue] = None,
                                          prs: List[PR] = None) -> float:
    """
    计算品鉴执行转化率
    
    Args:
        node_id: 节点ID
        messages: 所有消息列表
        bot_ids: 所有Bot的ID列表
        issues: Issue列表（可选）
        prs: PR列表（可选）
    
    Returns:
        float: 执行转化率 [0, 100]
    """
    from datetime import timedelta
    
    # 1. 筛选品鉴消息
    connoisseurship_messages = [
        msg for msg in messages
        if msg.from_uid == node_id and is_connoisseurship_message(msg.content)
    ]
    
    if len(connoisseurship_messages) == 0:
        return 0.0
    
    # 2. 检查每条品鉴是否有执行
    executed_count = 0
    
    for c_msg in connoisseurship_messages:
        executed = False
        
        # 执行方式1: Bot响应（30分钟内）
        window_30min = c_msg.timestamp + timedelta(minutes=30)
        for msg in messages:
            if (msg.from_uid in bot_ids and
                c_msg.timestamp < msg.timestamp <= window_30min and
                msg.channel_id == c_msg.channel_id):
                executed = True
                break
        
        # 执行方式2: Issue创建（1天内，需要Issue数据）
        if not executed and issues:
            window_1day = c_msg.timestamp + timedelta(days=1)
            for issue in issues:
                if c_msg.timestamp < issue.created_at <= window_1day:
                    # 简化判断：时间窗口内创建的Issue视为相关
                    executed = True
                    break
        
        # 执行方式3: PR提交（3天内，需要PR数据）
        if not executed and prs:
            window_3day = c_msg.timestamp + timedelta(days=3)
            for pr in prs:
                if c_msg.timestamp < pr.created_at <= window_3day:
                    executed = True
                    break
        
        if executed:
            executed_count += 1
    
    # 3. 计算转化率
    cc = (executed_count / len(connoisseurship_messages)) * 100
    return cc
```

### 数据需求

**消息数据**:
- `message.timestamp`: datetime
- `message.channel_id`: str
- Bot ID列表

**可选数据**:
- Issue数据（created_at）
- PR数据（created_at）

### 健康范围

**组织层面**:
- 高效组织: CC > 50%（品鉴被快速执行）
- 一般组织: CC = 30-50%
- 低效组织: CC < 30%（品鉴被忽视）

### 可视化

1. **漏斗图**: 品鉴消息 → Bot响应 → Issue → PR
2. **条形图**: Top 10 CC节点
3. **时间线**: 品鉴→执行的时间间隔分布

---

## 六、L3.4 品鉴网络放大 (Connoisseurship Amplification)

### 定义

**品鉴消息被其他节点转述/引用的次数，衡量品鉴的二次传播力**

### 公式

```
CA(v) = Count(品鉴被转述次数) / Count(品鉴消息数)
```

转述识别：
- 明确引用："YZ说..."、"根据XX的意见..."
- 内容相似（需文本匹配）

### 值域

[0, +∞)，值越高传播越强

### 业务含义

- **高CA (>2.0)**: 品鉴被广泛传播（如黄楠，被转述多）
- **中CA (0.5-2.0)**: 部分传播
- **低CA (<0.5)**: 传播弱

### 算法实现

```python
def calculate_connoisseurship_amplification(node_id: str,
                                             node_name: str,
                                             messages: List[Message]) -> float:
    """
    计算品鉴网络放大系数
    
    Args:
        node_id: 节点ID
        node_name: 节点名称（用于转述检测）
        messages: 所有消息列表
    
    Returns:
        float: 网络放大系数 [0, +∞)
    """
    # 1. 筛选品鉴消息
    connoisseurship_messages = [
        msg for msg in messages
        if msg.from_uid == node_id and is_connoisseurship_message(msg.content)
    ]
    
    if len(connoisseurship_messages) == 0:
        return 0.0
    
    # 2. 检测转述次数
    retelling_count = 0
    
    for msg in messages:
        # 排除自己的消息
        if msg.from_uid == node_id:
            continue
        
        # 检测是否提及该节点名称
        if node_name in msg.content:
            # 简化判断：包含名称视为转述
            # 更精确：需要上下文分析（"XX说..."、"根据XX..."）
            retelling_count += 1
    
    # 3. 计算放大系数
    ca = retelling_count / len(connoisseurship_messages)
    return ca


def detect_retelling_advanced(message: str, 
                                source_name: str,
                                connoisseurship_messages: List[Message]) -> bool:
    """
    高级转述检测（可选增强）
    
    检测模式：
    1. 明确引用："YZ说..."、"根据XX..."
    2. 内容相似（余弦相似度>阈值）
    """
    # 方式1: 明确引用模式
    retelling_patterns = [
        f"{source_name}说",
        f"根据{source_name}",
        f"{source_name}认为",
        f"{source_name}觉得"
    ]
    
    for pattern in retelling_patterns:
        if pattern in message:
            return True
    
    # 方式2: 内容相似检测（需要嵌入模型）
    # 简化实现：跳过
    
    return False
```

### 数据需求

**消息数据**:
- `message.content`: str（完整文本）

**节点数据**:
- `node.name`: str（用于转述检测）

**可选增强**:
- 文本嵌入模型（相似度检测）
- NER命名实体识别

### 健康范围

**个人层面**:
- 决策层: CA > 3.0（品鉴被大量传播）
- 中层: CA = 1.0-3.0
- 基层: CA < 1.0

### 可视化

1. **网络图**: 品鉴传播链（A说 → B转述 → C执行）
2. **条形图**: Top 10 CA节点
3. **时间线**: 品鉴→转述的时间演化

---

## 六、L3.5 Hub Score (HS) - 品鉴影响力比率 🆕

### 指标定义

**Hub Score = 被提及次数 / 发送消息数**

**核心测量**: 影响力 vs 活跃度比率

### 背景

Hub Score是OCTO-ONA的核心发现，源自Octo团队真实数据分析。通过Hub Score识别出完美的五层品鉴金字塔：

| 层级 | 角色 | Hub Score | 特征 |
|------|------|-----------|------|
| Layer 5 | 战略权威 | > 3.0 | 被咨询多，发言少（辉哥=4.0） |
| Layer 4 | 技术裁判 | ∞ | 只被咨询，不发言（嘉伟=∞） |
| Layer 3 | Bot接口 | 3.0-12.0 | 高频被调用（产品管家=12.6） |
| Layer 2 | 主动管理 | 0.3-1.0 | 主动推动（黄楠=0.3） |
| Layer 1 | 纯执行 | < 0.1 | 大量输出（刘乐君=0.0） |

### 公式

```
HS(v) = M_received(v) / M_sent(v)

M_received = Count(被提及次数)
M_sent = Count(发送消息数)
```

**特殊情况**:
- M_sent = 0 且 M_received > 0: HS = ∞（纯被动权威）
- M_sent = 0 且 M_received = 0: HS = 0.0（无活动）

### 值域

[0, +∞]，包括特殊值 ∞

### 业务含义

#### **高Hub Score (> 3.0) - 战略权威**
- **特征**: 被咨询多，主动发言少
- **角色**: 决策层、战略顾问
- **案例**: 辉哥（HS=4.0，1,187次被@，299条发送）
- **价值**: 被动影响力强，判断被高度认可

#### **极高Hub Score (∞) - 技术裁判**
- **特征**: 只被咨询，从不主动发言
- **角色**: 最终裁判、技术权威
- **案例**: 嘉伟（HS=∞，405次被@，0条发送）
- **价值**: 判断具有最终决定权

#### **中Hub Score (0.3-3.0) - Bot接口/主动管理**
- **特征**: 被咨询与发言相当
- **角色**: Bot、项目经理、一线管理者
- **案例**: 产品管家Bot（HS=12.6）、黄楠（HS=0.3）

#### **低Hub Score (< 0.1) - 纯执行**
- **特征**: 大量发言，很少被咨询
- **角色**: 执行者、一线开发
- **案例**: 刘乐君（HS=0.0，97次被@，5,270条发送）

### 算法实现

```python
def calculate_hub_score(messages: List[Message]) -> Dict[str, float]:
    """
    计算Hub Score
    
    Args:
        messages: 所有消息列表
    
    Returns:
        {node_id: hub_score, ...}
    """
    mentions = {}  # {node_id: 被@次数}
    messages_sent = {}  # {node_id: 发送消息数}
    
    for msg in messages:
        # 统计发送消息
        messages_sent[msg.from_uid] = messages_sent.get(msg.from_uid, 0) + 1
        
        # 统计被@（to_uids中的每个人都算被@）
        for mentioned_uid in msg.to_uids:
            mentions[mentioned_uid] = mentions.get(mentioned_uid, 0) + 1
    
    # 计算Hub Score
    hub_scores = {}
    all_nodes = set(list(mentions.keys()) + list(messages_sent.keys()))
    
    for uid in all_nodes:
        m_received = mentions.get(uid, 0)
        m_sent = messages_sent.get(uid, 0)
        
        if m_sent == 0:
            # 特殊情况：只被@，不发言
            hub_scores[uid] = float('inf') if m_received > 0 else 0.0
        else:
            hub_scores[uid] = m_received / m_sent
    
    return hub_scores


def classify_connoisseur_by_hub_score(hub_score: float) -> str:
    """
    基于Hub Score分类品鉴者层级
    
    Args:
        hub_score: Hub Score值
    
    Returns:
        层级标签 (L1-L5)
    """
    if hub_score == float('inf'):
        return "L4_技术裁判"
    elif hub_score > 3.0:
        return "L5_战略权威"
    elif hub_score >= 0.3:
        return "L2_主动管理"
    elif hub_score > 0:
        return "L1_纯执行"
    else:
        return "L0_无活动"
```

### 数据需求

**消息数据**:
- `message.from_uid`: 发送者
- `message.to_uids`: 接收者列表

**无需额外数据** — Hub Score仅基于消息元数据

### 健康范围

**组织层面**:
- HS > 3.0 人数占比: 5-15%（决策层合理范围）
- HS = ∞ 人数: 1-3人（最终裁判不宜过多）
- HS < 0.1 人数占比: > 50%（执行层应占多数）

**金字塔结构健康指标**:
```
L5 (HS>3.0):      5-10%   ▲
L4 (HS=∞):        1-3%    ▲
L2-L3 (0.3-3.0):  20-30%  ■■
L1 (HS<0.1):      60-75%  ■■■■■
```

### 与其他指标的关系

#### **Hub Score vs Degree Centrality**
- Degree: 总连接数（活跃度）
- Hub Score: 被动影响 / 主动活跃（影响力 vs 活跃度比）

#### **Hub Score vs Betweenness Centrality**
- BC: 桥梁作用（信息中转）
- Hub Score: 决策权威（被咨询频率）

#### **Hub Score vs 品鉴频率（L3.1）**
- L3.1: 主动品鉴占比
- L3.5: 被动品鉴强度（被咨询）

**组合解读**:
- 高Hub Score + 高品鉴频率 = 全能品鉴者（主动+被动都强）
- 高Hub Score + 低品鉴频率 = 被动权威（嘉伟型）
- 低Hub Score + 高品鉴频率 = 主动品鉴者（刘乐君型）

### 可视化

1. **金字塔图**: 5层品鉴金字塔（Mermaid）
2. **散点图**: Hub Score vs 发送消息数
3. **条形图**: Top 10 Hub Score节点
4. **热力图**: Hub Score分布（团队×时间）

### Layer 5洞察规则

```python
DiagnosticRule(
    id="CONNOISSEUR_PYRAMID_IMBALANCE",
    name="品鉴金字塔失衡",
    category="connoisseurship",
    severity="warning",
    condition=lambda m: (
        m.get("hub_score_layer5_ratio", 0) > 0.15 or
        m.get("hub_score_layer1_ratio", 0) < 0.5
    ),
    description="品鉴金字塔结构失衡：L5占比 {hub_score_layer5_ratio:.1%}（健康范围5-15%），L1占比 {hub_score_layer1_ratio:.1%}（健康范围>50%）",
    recommendations=[
        "如果L5过多：组织层级过深，决策效率低",
        "如果L1过少：缺少执行力，团队规模不足",
        "理想结构：金字塔形（L1 > L2 > L5）"
    ],
    related_metrics=["L3.5"],
    priority=7
)
```

### 实施优先级

**P0 - 核心指标**

Hub Score是OCTO-ONA的灵魂指标，必须在第一批实现。

---

## 七、L3指标实施优先级

### P0指标（必须实现，4个）

1. **L3.1 品鉴行为频率** — 基础统计
2. **L3.2 品鉴影响广度** — 影响范围
3. **L3.3 品鉴执行转化** — 执行效果
4. **L3.5 Hub Score** 🆕 — 品鉴金字塔核心指标

### P1指标（增强分析，1个）

4. **L3.4 品鉴网络放大** — 二次传播

---

## 八、实施路线图

### Phase 1: 品鉴识别（2周）

**实现**:
- 规则式品鉴识别算法
- 基于Octo数据标注100条验证
- 调整关键词库和阈值

**目标**: 准确率>70%

---

### Phase 2: 基础指标（2周）

**实现**:
- L3.1 品鉴行为频率
- L3.2 品鉴影响广度

**产出**: 品鉴者排名、影响范围可视化

---

### Phase 3: 高级指标（2周）

**实现**:
- L3.3 品鉴执行转化
- L3.4 品鉴网络放大

**产出**: 完整品鉴分析报告

---

### Phase 4: LLM增强（可选，2周）

**条件**: 规则式准确率<70%

**实现**:
- LLM品鉴识别
- Few-shot learning
- 批量优化

---

### 总计: 6-8周完成L3层

---

## 九、数据需求总结

### 必需字段

**消息数据**:
- `message.from_uid`: str
- `message.content`: str（完整文本）
- `message.timestamp`: datetime
- `message.mentions`: List[str]
- `message.channel_id`: str

**节点数据**:
- `node.name`: str（用于转述检测）

**Bot列表**:
- 所有Bot的ID列表

### 可选增强

- Issue数据（L3.3）
- PR数据（L3.3）
- 文本嵌入模型（L3.4）

---

## 十、与Nature论文的对应

### 命题2: Connoisseurship Value

**证据链**:

1. **L3.1 品鉴频率** → 人类持续输出专业判断
2. **L3.2 影响广度** → 判断通过网络触达组织
3. **L3.3 执行转化** → 判断驱动AI/人类执行
4. **L3.4 网络放大** → 判断被传播放大

**核心论点**:
> "AI时代，人类品鉴的价值由其网络影响力体现：频率体现角色定位，广度体现触达范围，转化体现执行效果，放大体现传播力度。品鉴不是孤立的主观评判，而是驱动组织网络行动的关键节点行为。"

---

## 十一、关键挑战与解决方案

### 挑战1: 品鉴识别准确率

**问题**: 规则式可能误判

**解决**:
- Phase 1先验证规则式
- 准确率不足再引入LLM
- 持续迭代关键词库

---

### 挑战2: 执行关联判定

**问题**: 如何确定"这个执行是因为那个品鉴"

**解决**:
- 时间窗口限制（30分钟/1天/3天）
- 频道/主题相关性
- 简化判断（窗口内视为相关）

---

### 挑战3: 转述检测复杂度

**问题**: "YZ说"容易检测，隐性转述难

**解决**:
- Phase 1只检测明确引用
- Phase 2可选：文本相似度
- 接受不完美（覆盖主要情况即可）

---

## 十二、下一步

**L3品鉴指标算法已完成（4个）。**

**至此，OCTO-ONA核心指标设计全部完成**:
- ✅ Bot功能标签（8个）
- ✅ L1基础指标（8个）
- ✅ L3品鉴指标（4个）

**总计**: 20个指标完整定义

**变更记录**:
- 2026-03-19 v1.0: 初始版本，4个品鉴指标（L3.1-L3.4）
- 2026-03-19 v1.1: 新增L3.5 Hub Score指标（品鉴金字塔核心），P0指标从3个增至4个
