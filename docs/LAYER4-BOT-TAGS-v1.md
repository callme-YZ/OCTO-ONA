# OCTO-ONA Bot功能标签算法规范 v1.0

**更新时间**: 2026-03-19  
**聚焦**: P0标签（5个）详细算法定义

---

## 一、总览

### P0标签清单

| ID | 标签名称 | 核心指标 | 阈值类型 |
|----|---------|---------|---------|
| T1 | 跨团队连接 | Betweenness + 团队数 | 绝对阈值 |
| T2 | 团队内枢纽 | Degree + 跨团队比例 | 相对阈值(P75) |
| T3 | 人类代理 | 边权重 + creator关系 | 相对阈值(P90) |
| T4 | 信息聚合 | Degree + In/Out比 | 相对阈值(P75) |
| T5 | 高活跃 | 消息数 | 相对阈值(P75) |

### 阈值类型说明

**绝对阈值**: 固定值（如团队数≥3）  
**相对阈值**: 基于数据分布（如P75分位数）  
**需要标定**: 用Octo数据计算P25/P50/P75/P90

---

## 二、T1: 跨团队连接 (Cross-Team Connector)

### 定义

**打破团队孤岛，促进跨团队知识流动的Bot**

### 网络特征

- 高Betweenness Centrality（经常出现在不同团队间的路径上）
- 连接≥3个不同团队

### 判定算法

```python
def is_cross_team_connector(bot: AIAgentNode, graph: nx.Graph) -> bool:
    """
    判定Bot是否为跨团队连接者
    
    Args:
        bot: Bot节点
        graph: 网络图（包含team属性）
    
    Returns:
        bool: 是否符合标签
    """
    # 1. 计算Betweenness Centrality
    bc = nx.betweenness_centrality(graph)[bot.id]
    
    # 2. 计算连接的团队数
    connected_teams = get_connected_teams(bot, graph)
    
    # 3. 判定条件
    # 条件1: BC > 阈值（待标定，初步设为0.1）
    # 条件2: 连接团队数 >= 3
    threshold_bc = 0.1  # TODO: 基于Octo数据标定
    min_teams = 3
    
    return bc > threshold_bc and len(connected_teams) >= min_teams


def get_connected_teams(bot: AIAgentNode, graph: nx.Graph) -> Set[str]:
    """
    获取Bot连接的团队集合
    
    Args:
        bot: Bot节点
        graph: 网络图
    
    Returns:
        Set[str]: 团队名称集合
    """
    teams = set()
    
    # 遍历Bot的所有邻居节点
    for neighbor in graph.neighbors(bot.id):
        node = graph.nodes[neighbor]
        # 只统计人类节点的团队
        if node.get('type') == 'human' and 'team' in node:
            teams.add(node['team'])
    
    return teams
```

### 数据需求

**节点属性**:
- `node.type`: "human" | "ai_agent"
- `node.team`: str（人类节点必需）

**图结构**:
- 无向图或有向图均可
- 需支持 `nx.betweenness_centrality()`

**计算复杂度**: O(V·E)（Betweenness算法）

### 阈值标定方法

```python
# 用Octo数据标定BC阈值
def calibrate_bc_threshold(graph: nx.Graph) -> float:
    """
    基于数据分布标定BC阈值
    """
    # 计算所有Bot的BC
    bc_scores = nx.betweenness_centrality(graph)
    bot_bc = [bc for node_id, bc in bc_scores.items() 
              if graph.nodes[node_id]['type'] == 'ai_agent']
    
    # 取P50或P75作为阈值
    threshold = np.percentile(bot_bc, 50)  # 或75
    
    return threshold
```

### 示例

**输入**:
```python
bot = AIAgentNode(id="chenpipi_bot", bot_name="陈皮皮")
graph = {
    "nodes": [
        {"id": "chenpipi_bot", "type": "ai_agent"},
        {"id": "huangnan", "type": "human", "team": "产品"},
        {"id": "jiawei", "type": "human", "team": "研发"},
        {"id": "merlin", "type": "human", "team": "研发"},
        {"id": "lejun", "type": "human", "team": "产品"}
    ],
    "edges": [
        ("chenpipi_bot", "huangnan"),
        ("chenpipi_bot", "jiawei"),
        ("chenpipi_bot", "merlin"),
        ("chenpipi_bot", "lejun")
    ]
}
```

**输出**:
```python
bc = 0.25  # 高BC（假设）
teams = {"产品", "研发"}  # 2个团队（不满足≥3）
result = False  # 不符合标签
```

### 可视化

- **网络图**: 菱形节点，蓝色
- **标签**: "连接3个团队: 产品/研发/测试"

---

## 三、T2: 团队内枢纽 (Intra-Team Hub)

### 定义

**在单个团队内连接多数成员的中心Bot**

### 网络特征

- 高Degree Centrality（连接数多）
- 跨团队边占比低（<30%）

### 判定算法

```python
def is_intra_team_hub(bot: AIAgentNode, graph: nx.Graph) -> bool:
    """
    判定Bot是否为团队内枢纽
    
    Args:
        bot: Bot节点
        graph: 网络图
    
    Returns:
        bool: 是否符合标签
    """
    # 1. 计算Degree Centrality
    degree = nx.degree_centrality(graph)[bot.id]
    
    # 2. 计算跨团队边占比
    cross_team_ratio = get_cross_team_edge_ratio(bot, graph)
    
    # 3. 判定条件
    # 条件1: Degree > P75（高连接度）
    # 条件2: 跨团队边占比 < 30%（主要在单团队内）
    threshold_degree = 0.5  # TODO: 基于Octo数据标定为P75
    max_cross_ratio = 0.3
    
    return degree > threshold_degree and cross_team_ratio < max_cross_ratio


def get_cross_team_edge_ratio(bot: AIAgentNode, graph: nx.Graph) -> float:
    """
    计算Bot的跨团队边占比
    
    Args:
        bot: Bot节点
        graph: 网络图
    
    Returns:
        float: 跨团队边占比 [0, 1]
    """
    total_edges = 0
    cross_team_edges = 0
    
    # 获取Bot的主要团队（连接最多的团队）
    primary_team = get_primary_team(bot, graph)
    
    # 遍历Bot的所有边
    for neighbor in graph.neighbors(bot.id):
        node = graph.nodes[neighbor]
        if node.get('type') == 'human':
            total_edges += 1
            if node.get('team') != primary_team:
                cross_team_edges += 1
    
    if total_edges == 0:
        return 0.0
    
    return cross_team_edges / total_edges


def get_primary_team(bot: AIAgentNode, graph: nx.Graph) -> Optional[str]:
    """
    获取Bot的主要团队（连接最多的团队）
    """
    team_counts = {}
    
    for neighbor in graph.neighbors(bot.id):
        node = graph.nodes[neighbor]
        if node.get('type') == 'human' and 'team' in node:
            team = node['team']
            team_counts[team] = team_counts.get(team, 0) + 1
    
    if not team_counts:
        return None
    
    return max(team_counts, key=team_counts.get)
```

### 数据需求

**节点属性**:
- `node.type`: "human" | "ai_agent"
- `node.team`: str（人类节点）

**图结构**:
- 无向图
- 需支持 `graph.neighbors()`

### 阈值标定

```python
def calibrate_degree_threshold(graph: nx.Graph) -> float:
    """
    标定Degree阈值为P75
    """
    degree_scores = nx.degree_centrality(graph)
    bot_degrees = [deg for node_id, deg in degree_scores.items() 
                   if graph.nodes[node_id]['type'] == 'ai_agent']
    
    return np.percentile(bot_degrees, 75)
```

### 示例

**输入**:
```python
bot = AIAgentNode(id="wuyun_bot")
# 连接产品团队5人，研发团队1人
```

**输出**:
```python
degree = 0.6  # 高Degree
primary_team = "产品"
cross_ratio = 1/6 = 0.17  # <0.3
result = True  # 符合"团队内枢纽"
```

### 可视化

- **网络图**: 圆形节点，节点大小 = Degree
- **标签**: "产品团队枢纽"

---

## 四、T3: 人类代理 (Human Proxy)

### 定义

**代表特定人类节点回答问题、协调任务的Bot**

### 网络特征

- 与特定人类有强关系（高边权重）
- 通常由该人类创建

### 判定算法

```python
def is_human_proxy(bot: AIAgentNode, graph: nx.Graph) -> bool:
    """
    判定Bot是否为人类代理
    
    Args:
        bot: Bot节点（需包含creator_uid）
        graph: 网络图（边需包含weight）
    
    Returns:
        bool: 是否符合标签
    """
    # 方法1: 检查是否与creator有强关系
    if bot.creator_uid:
        creator_edge_weight = get_edge_weight(bot.id, bot.creator_uid, graph)
        # 如果与创建者的边权重 > P90，则为代理
        threshold_weight = get_p90_edge_weight(graph)
        if creator_edge_weight > threshold_weight:
            return True
    
    # 方法2: 检查是否与任意人类有强关系
    max_edge_weight = get_max_edge_weight_to_human(bot, graph)
    threshold_weight = get_p90_edge_weight(graph)
    
    return max_edge_weight > threshold_weight


def get_edge_weight(node1: str, node2: str, graph: nx.Graph) -> float:
    """
    获取两个节点间的边权重
    """
    if graph.has_edge(node1, node2):
        return graph[node1][node2].get('weight', 0)
    return 0.0


def get_max_edge_weight_to_human(bot: AIAgentNode, graph: nx.Graph) -> float:
    """
    获取Bot到人类节点的最大边权重
    """
    max_weight = 0.0
    
    for neighbor in graph.neighbors(bot.id):
        node = graph.nodes[neighbor]
        if node.get('type') == 'human':
            weight = graph[bot.id][neighbor].get('weight', 0)
            max_weight = max(max_weight, weight)
    
    return max_weight


def get_p90_edge_weight(graph: nx.Graph) -> float:
    """
    计算所有H-B边权重的P90分位数
    """
    weights = []
    
    for u, v, data in graph.edges(data=True):
        node_u = graph.nodes[u]
        node_v = graph.nodes[v]
        # 只统计人-Bot边
        if (node_u.get('type') == 'human' and node_v.get('type') == 'ai_agent') or \
           (node_u.get('type') == 'ai_agent' and node_v.get('type') == 'human'):
            weights.append(data.get('weight', 0))
    
    if not weights:
        return 0.0
    
    return np.percentile(weights, 90)
```

### 数据需求

**节点属性**:
- `AIAgentNode.creator_uid`: str（Bot创建者）
- `node.type`: "human" | "ai_agent"

**边属性**:
- `edge.weight`: int（消息数）

### 阈值标定

```python
# 用Octo数据标定
# 示例：如果P90边权重 = 100条消息
# 则边权重>100的Bot-人类关系视为"强关系"
```

### 示例

**输入**:
```python
bot = AIAgentNode(id="jojo_bot", creator_uid="yejia")
edge_weights = {
    ("jojo_bot", "yejia"): 84,  # JOJO-叶佳
    ("jojo_bot", "huangnan"): 5
}
p90_threshold = 50  # 假设P90=50
```

**输出**:
```python
max_weight = 84 > 50
result = True  # 符合"人类代理"
proxy_for = "叶佳"
```

### 可视化

- **网络图**: 三角形节点，与主人粗线连接
- **标签**: "叶佳的代理Bot"

---

## 五、T4: 信息聚合 (Information Aggregator)

### 定义

**聚合多源信息、综合观点的决策支持Bot**

### 网络特征

- 高Degree（接收多源消息）
- In-degree > Out-degree（接收多于发送）

### 判定算法

```python
def is_information_aggregator(bot: AIAgentNode, graph: nx.DiGraph) -> bool:
    """
    判定Bot是否为信息聚合者
    
    Args:
        bot: Bot节点
        graph: 有向图（需区分in/out）
    
    Returns:
        bool: 是否符合标签
    """
    # 1. 计算Degree
    degree = graph.degree(bot.id)
    
    # 2. 计算In-degree和Out-degree
    in_degree = graph.in_degree(bot.id)
    out_degree = graph.out_degree(bot.id)
    
    # 3. 判定条件
    # 条件1: Degree > P75（高连接度）
    # 条件2: In-degree > Out-degree（接收多于发送）
    threshold_degree = get_p75_degree(graph)
    
    return degree > threshold_degree and in_degree > out_degree


def get_p75_degree(graph: nx.DiGraph) -> int:
    """
    计算Bot节点Degree的P75分位数
    """
    bot_degrees = [graph.degree(node) for node, data in graph.nodes(data=True)
                   if data.get('type') == 'ai_agent']
    
    if not bot_degrees:
        return 0
    
    return int(np.percentile(bot_degrees, 75))
```

### 数据需求

**图结构**:
- **有向图** (DiGraph)
- 区分消息方向（Human→Bot, Bot→Human）

**边方向**:
- `(human, bot)`: 人类向Bot发消息
- `(bot, human)`: Bot向人类发消息

### 阈值标定

```python
# 用Octo数据标定P75 Degree
# 示例：如果P75 Degree = 10
# 则Degree>10且In>Out的Bot视为"信息聚合"
```

### 示例

**输入**:
```python
bot = AIAgentNode(id="wuyun_bot")
in_degree = 20  # 20个人向Bot发消息
out_degree = 15  # Bot向15个人发消息
total_degree = 35
p75_degree = 25
```

**输出**:
```python
35 > 25 and 20 > 15
result = True  # 符合"信息聚合"
```

### 可视化

- **桑基图**: 多源信息流向Bot
- **标签**: "聚合20个来源"

---

## 六、T5: 高活跃 (High Activity)

### 定义

**基础分类，识别活跃Bot和边缘Bot**

### 网络特征

- 消息数 > P75分位数

### 判定算法

```python
def is_high_activity(bot: AIAgentNode, messages: List[Message]) -> bool:
    """
    判定Bot是否高活跃
    
    Args:
        bot: Bot节点
        messages: 所有消息列表
    
    Returns:
        bool: 是否符合标签
    """
    # 1. 统计Bot的消息数
    bot_msg_count = count_bot_messages(bot.id, messages)
    
    # 2. 计算所有Bot消息数的P75
    threshold = get_p75_bot_message_count(messages)
    
    # 3. 判定
    return bot_msg_count > threshold


def count_bot_messages(bot_id: str, messages: List[Message]) -> int:
    """
    统计Bot发送的消息数
    """
    return sum(1 for msg in messages if msg.from_uid == bot_id)


def get_p75_bot_message_count(messages: List[Message], 
                                bot_ids: List[str]) -> int:
    """
    计算所有Bot消息数的P75分位数
    
    Args:
        messages: 所有消息
        bot_ids: 所有Bot的ID列表
    
    Returns:
        int: P75消息数阈值
    """
    bot_msg_counts = []
    
    for bot_id in bot_ids:
        count = count_bot_messages(bot_id, messages)
        bot_msg_counts.append(count)
    
    if not bot_msg_counts:
        return 0
    
    return int(np.percentile(bot_msg_counts, 75))
```

### 数据需求

**消息数据**:
- `message.from_uid`: str
- 所有消息的列表

**Bot列表**:
- 所有Bot的ID列表（用于计算P75）

### 阈值标定

```python
# Octo数据示例
# 如果P75消息数 = 500
# 则消息数>500的Bot为"高活跃"
```

### 示例

**输入**:
```python
bot = AIAgentNode(id="chenpipi_bot")
bot_messages = 816  # 陈皮皮发送816条
p75_threshold = 500  # P75=500
```

**输出**:
```python
816 > 500
result = True  # 符合"高活跃"
```

### 可视化

- **条形图**: 活跃度排名
- **网络图**: 低活跃Bot半透明

---

## 七、算法实现优先级

### Phase 1: 基础实现（1周）

**实现**:
- T5 高活跃（最简单，无需图算法）
- T2 团队内枢纽（只需Degree）
- T4 信息聚合（需有向图）

**产出**:
- 3个标签的Python函数
- 基于Octo数据的阈值标定

### Phase 2: 高级实现（2周）

**实现**:
- T1 跨团队连接（需Betweenness）
- T3 人类代理（需边权重统计）

**产出**:
- 完整5个P0标签
- 单元测试

### Phase 3: 集成（1周）

**实现**:
- 标签计算Pipeline
- 多标签输出
- 可视化集成

---

## 八、测试用例设计

### 测试数据

**使用Octo真实数据**:
- 7个人类节点
- 8个Bot节点
- 33,770条消息
- 194条边

### 预期结果

| Bot | T1跨团队 | T2枢纽 | T3代理 | T4聚合 | T5高活跃 |
|-----|----------|--------|--------|--------|---------|
| 陈皮皮 | ✅ | ✅ | ❌ | ✅ | ✅ |
| 无云 | ❌ | ✅ | ❌ | ✅ | ✅ |
| JOJO | ❌ | ❌ | ✅ | ❌ | ❌ |
| 花花 | ❌ | ❌ | ❌ | ❌ | ❌ |

（待Octo数据验证）

---

## 九、下一步

1. **实现T5算法** — 最简单，先验证流程
2. **标定Octo阈值** — 计算P75/P90分位数
3. **实现T2/T4** — 验证Degree算法
4. **实现T1/T3** — 验证BC和边权重
5. **集成测试** — 跑完整Pipeline

**准备好开始实现了吗？**

---

## 十、P1标签详细算法（个体特性）

### T6: 快速响应 (Fast Responder)

#### 定义

**响应速度快的Bot，体现AI的速度优势**

#### 行为特征

- 平均响应时间 < 10秒
- 或响应时间 < 人类平均响应时间的50%

#### 判定算法

```python
def is_fast_responder(bot: AIAgentNode, messages: List[Message]) -> bool:
    """
    判定Bot是否为快速响应者
    
    Args:
        bot: Bot节点
        messages: 所有消息列表（需包含timestamp和reply_to）
    
    Returns:
        bool: 是否符合标签
    """
    # 1. 计算Bot的平均响应时间
    avg_response_time = calculate_avg_response_time(bot.id, messages)
    
    # 2. 判定条件
    # 方法1: 绝对阈值（10秒）
    absolute_threshold = 10  # 秒
    
    # 方法2: 相对阈值（人类响应时间的50%）
    human_avg_response = calculate_avg_human_response_time(messages)
    relative_threshold = human_avg_response * 0.5
    
    # 满足任一条件即可
    return avg_response_time < absolute_threshold or \
           avg_response_time < relative_threshold


def calculate_avg_response_time(bot_id: str, messages: List[Message]) -> float:
    """
    计算Bot的平均响应时间
    
    Args:
        bot_id: Bot ID
        messages: 所有消息列表
    
    Returns:
        float: 平均响应时间（秒）
    """
    response_times = []
    
    # 构建消息字典，方便查找
    msg_dict = {msg.id: msg for msg in messages}
    
    # 遍历Bot发送的消息
    for msg in messages:
        if msg.from_uid == bot_id and msg.reply_to:
            # 找到被回复的消息
            original_msg = msg_dict.get(msg.reply_to)
            if original_msg:
                # 计算响应时间
                response_time = (msg.timestamp - original_msg.timestamp).total_seconds()
                if response_time > 0:  # 排除异常值
                    response_times.append(response_time)
    
    if not response_times:
        return float('inf')  # 无响应数据，返回无穷大
    
    return sum(response_times) / len(response_times)


def calculate_avg_human_response_time(messages: List[Message]) -> float:
    """
    计算人类的平均响应时间（用于相对比较）
    """
    response_times = []
    msg_dict = {msg.id: msg for msg in messages}
    
    for msg in messages:
        # 只统计人类的回复
        if msg.from_uid.startswith('human_') and msg.reply_to:  # 假设人类ID有前缀
            original_msg = msg_dict.get(msg.reply_to)
            if original_msg:
                response_time = (msg.timestamp - original_msg.timestamp).total_seconds()
                if 0 < response_time < 86400:  # 排除异常值（>1天）
                    response_times.append(response_time)
    
    if not response_times:
        return 3600.0  # 默认1小时
    
    return sum(response_times) / len(response_times)
```

#### 数据需求

**消息数据**:
- `message.from_uid`: str
- `message.timestamp`: datetime
- `message.reply_to`: Optional[str]（回复的消息ID）

**节点类型**:
- 需区分人类和Bot（用于计算人类基准）

#### 阈值标定

```python
# Octo数据示例
# 假设人类平均响应时间 = 2小时
# 则Bot响应 < 1小时（50%）为"快速响应"
# 或Bot响应 < 10秒（绝对阈值）
```

#### 示例

**输入**:
```python
bot = AIAgentNode(id="wuyun_bot")
bot_responses = [
    (original_time="10:00:00", response_time="10:00:08"),  # 8秒
    (original_time="11:00:00", response_time="11:00:12"),  # 12秒
    (original_time="14:00:00", response_time="14:00:05"),  # 5秒
]
avg_response_time = (8 + 12 + 5) / 3 = 8.33秒
```

**输出**:
```python
8.33 < 10  # 满足绝对阈值
result = True  # 符合"快速响应"
```

#### 可视化

- **条形图**: Bot响应时间对比
- **折线图**: 响应时间趋势
- **标签**: "平均响应8秒"

---

### T7: 执行导向 (Execution-Oriented)

#### 定义

**发送消息多于接收，偏向执行和输出的Bot**

#### 行为特征

- Out-degree > In-degree
- 或发送消息数 > 接收消息数 × 1.5

#### 判定算法

```python
def is_execution_oriented(bot: AIAgentNode, graph: nx.DiGraph, 
                          messages: List[Message]) -> bool:
    """
    判定Bot是否为执行导向
    
    Args:
        bot: Bot节点
        graph: 有向图
        messages: 消息列表
    
    Returns:
        bool: 是否符合标签
    """
    # 方法1: 基于图结构的Degree
    in_degree = graph.in_degree(bot.id)
    out_degree = graph.out_degree(bot.id)
    
    # 方法2: 基于消息数统计
    sent_count = count_messages_sent(bot.id, messages)
    received_count = count_messages_received(bot.id, messages)
    
    # 判定条件（满足任一）
    # 条件1: Out-degree > In-degree
    # 条件2: 发送消息 > 接收消息 × 1.5
    condition1 = out_degree > in_degree
    condition2 = sent_count > received_count * 1.5
    
    return condition1 or condition2


def count_messages_sent(bot_id: str, messages: List[Message]) -> int:
    """
    统计Bot发送的消息数
    """
    return sum(1 for msg in messages if msg.from_uid == bot_id)


def count_messages_received(bot_id: str, messages: List[Message]) -> int:
    """
    统计Bot接收的消息数（被提及或被回复）
    """
    count = 0
    for msg in messages:
        # 方式1: 被提及
        if bot_id in msg.mentions:
            count += 1
        # 方式2: 被回复（如果message.to_uid存在）
        elif hasattr(msg, 'to_uid') and msg.to_uid == bot_id:
            count += 1
    
    return count
```

#### 数据需求

**图结构**:
- 有向图（DiGraph）
- 需区分In-degree和Out-degree

**消息数据**:
- `message.from_uid`: str
- `message.mentions`: List[str]
- `message.to_uid`: Optional[str]

#### 示例

**输入**:
```python
bot = AIAgentNode(id="chenpipi_bot")
sent_messages = 816
received_messages = 300
out_degree = 25
in_degree = 15
```

**输出**:
```python
# 条件1: 25 > 15 ✅
# 条件2: 816 > 300 × 1.5 = 450 ✅
result = True  # 符合"执行导向"
```

#### 可视化

- **桑基图**: Bot的输入输出流
- **条形图**: 发送vs接收对比
- **标签**: "输出/输入比 = 2.7"

---

## 十一、P2标签详细算法（细分维度）

### T8: 专业化 (Specialized)

#### 定义

**专注于特定领域或频道的Bot**

#### 行为特征

- 消息集中在≤2个频道
- 或单一频道消息占比 > 80%

#### 判定算法

```python
def is_specialized(bot: AIAgentNode, messages: List[Message]) -> bool:
    """
    判定Bot是否专业化
    
    Args:
        bot: Bot节点
        messages: 消息列表（需包含channel_id）
    
    Returns:
        bool: 是否符合标签
    """
    # 1. 统计Bot在各频道的消息数
    channel_counts = count_messages_by_channel(bot.id, messages)
    
    # 2. 判定条件（满足任一）
    # 条件1: 只在≤2个频道活跃
    num_channels = len(channel_counts)
    
    # 条件2: 单一频道消息占比>80%
    total_messages = sum(channel_counts.values())
    if total_messages > 0:
        max_channel_ratio = max(channel_counts.values()) / total_messages
    else:
        max_channel_ratio = 0.0
    
    return num_channels <= 2 or max_channel_ratio > 0.8


def count_messages_by_channel(bot_id: str, 
                                messages: List[Message]) -> Dict[str, int]:
    """
    统计Bot在各频道的消息数
    
    Args:
        bot_id: Bot ID
        messages: 消息列表
    
    Returns:
        Dict[str, int]: {channel_id: message_count}
    """
    channel_counts = {}
    
    for msg in messages:
        if msg.from_uid == bot_id and msg.channel_id:
            channel_id = msg.channel_id
            channel_counts[channel_id] = channel_counts.get(channel_id, 0) + 1
    
    return channel_counts
```

#### 数据需求

**消息数据**:
- `message.from_uid`: str
- `message.channel_id`: str（频道/群组ID）

#### 示例

**输入**:
```python
bot = AIAgentNode(id="pentland_bot")
channel_distribution = {
    "channel_001": 295,  # 98.3%
    "channel_002": 5     # 1.7%
}
total = 300
```

**输出**:
```python
# 条件1: 2个频道 ✅
# 条件2: 295/300 = 98.3% > 80% ✅
result = True  # 符合"专业化"
primary_channel = "channel_001"
```

#### 可视化

- **饼图**: 频道分布
- **标签**: "专注于代码审查频道（98%）"

---

## 十二、P1/P2标签总结

### 标签对比

| 标签 | 优先级 | 关注点 | 核心指标 | 实现难度 |
|------|--------|--------|---------|---------|
| T6 快速响应 | P1 | 响应速度 | 平均响应时间 | 中（需reply_to字段）|
| T7 执行导向 | P1 | 消息方向 | Out/In比 | 低（基于Degree）|
| T8 专业化 | P2 | 频道分布 | 频道集中度 | 低（统计即可）|

### 数据需求汇总（P1/P2）

**新增字段**:
- `message.reply_to`: Optional[str]（T6需要）
- `message.channel_id`: str（T8需要）
- `message.to_uid`: Optional[str]（T7辅助）

**图结构**:
- 有向图（T7需要区分in/out）

### 实施建议

**Phase 1**（最简单）:
- T8 专业化（只需统计）
- T7 执行导向（基于Degree）

**Phase 2**（需reply_to字段）:
- T6 快速响应（需要消息链追踪）

---

## 十三、完整标签体系实施路线图

### Phase 1: 基础标签（1周）
**实现**:
- ✅ T5 高活跃（消息数统计）
- ✅ T8 专业化（频道分布）
- ✅ T7 执行导向（Degree比较）

**数据需求**: messages + channel_id + graph

### Phase 2: 网络标签（2周）
**实现**:
- ✅ T2 团队内枢纽（Degree + 团队）
- ✅ T4 信息聚合（In/Out Degree）

**数据需求**: + node.team + DiGraph

### Phase 3: 高级标签（2周）
**实现**:
- ✅ T1 跨团队连接（Betweenness）
- ✅ T3 人类代理（边权重）
- ✅ T6 快速响应（reply_to追踪）

**数据需求**: + message.reply_to + edge.weight

### Phase 4: 验证优化（1周）
- 基于Octo数据标定所有阈值
- 多标签测试
- 可视化集成

**总计**: 6周完成8个标签

---

## 十四、下一步

**P1/P2标签算法已完成。**

**接下来**:
1. 继续设计L1基础指标算法（8个）
2. 还是先讨论什么？

