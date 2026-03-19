# OCTO-ONA Layer 2 数据模型设计 v1.0

**更新时间**: 2026-03-19  
**设计原则**: 指标驱动 - 从Layer 4指标需求反推数据模型

---

## 一、总览

### 设计思路

**自下而上推导**:
```
Layer 4指标需求
   ↓ 提取数据字段
Layer 2数据模型
   ↓ 定义提取规则
Layer 1数据适配器
```

### 核心实体（5类）

1. **HumanNode** — 人类节点
2. **AIAgentNode** — AI Bot节点
3. **Edge** — 边（连接关系）
4. **Message** — 消息
5. **NetworkGraph** — 网络图（容器）

---

## 二、数据需求汇总（从指标反推）

### Bot标签需要的字段

| 标签 | 需要字段 |
|------|---------|
| T1 跨团队连接 | node.team, BC值 |
| T2 团队内枢纽 | node.team, Degree值 |
| T3 人类代理 | edge.weight, bot.creator_uid |
| T4 信息聚合 | In-degree, Out-degree |
| T5 高活跃 | message count |
| T6 快速响应 | message.reply_to, message.timestamp |
| T7 执行导向 | In-degree, Out-degree |
| T8 专业化 | message.channel_id |

### L1基础指标需要的字段

| 指标 | 需要字段 |
|------|---------|
| L1.1 Degree | graph基础 |
| L1.2 Betweenness | graph基础 |
| L1.3 Closeness | graph基础 |
| L1.4 Density | graph基础 |
| L1.5 Leadership Distance | node.role（识别决策层） |
| L1.6 Silo Index | node.team |
| L1.7 Burnout Risk | BC值 + node.type |
| L1.8 Bottleneck Risk | 桥检测（graph） |

### L3品鉴指标需要的字段

| 指标 | 需要字段 |
|------|---------|
| L3.1 品鉴频率 | message.content（文本）, message.from_uid |
| L3.2 影响广度 | message.mentions, message.channel_id, message.timestamp |
| L3.3 执行转化 | message.timestamp, bot_ids, Issue/PR数据（可选） |
| L3.4 网络放大 | message.content, node.name（转述检测） |

---

## 三、Pydantic数据模型

### 3.1 HumanNode（人类节点）

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class HumanNode(BaseModel):
    """
    人类节点
    """
    # 基础标识
    id: str = Field(..., description="节点唯一ID（通常是UID）")
    name: str = Field(..., description="姓名")
    
    # 组织属性（L1.5/L1.6需要）
    role: Optional[str] = Field(None, description="角色/职位（用于Leadership Distance）")
    team: Optional[str] = Field(None, description="所属团队（用于Silo Index）")
    
    # 联系方式（可选）
    email: Optional[str] = Field(None, description="邮箱")
    timezone: Optional[str] = Field(None, description="时区")
    
    # 元数据
    type: str = Field(default="human", const=True, description="节点类型标识")
    created_at: Optional[datetime] = Field(None, description="账号创建时间")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "71e2a58ecce04aba972ce73c72b89f64",
                "name": "黄楠",
                "role": "Product Owner",
                "team": "产品",
                "email": "huangnan@example.com",
                "type": "human"
            }
        }
```

---

### 3.2 AIAgentNode（AI Bot节点）

```python
class AIAgentNode(BaseModel):
    """
    AI Bot节点
    """
    # 基础标识
    id: str = Field(..., description="Bot唯一ID")
    bot_name: str = Field(..., description="Bot名称")
    
    # 归属关系（T3需要）
    creator_uid: Optional[str] = Field(None, description="创建者UID（用于人类代理判定）")
    
    # 能力属性
    capabilities: List[str] = Field(default_factory=list, description="能力标签列表")
    
    # Layer 4计算后回填的标签（T1-T8）
    functional_tags: List[str] = Field(default_factory=list, description="功能标签（T1-T8）")
    
    # 性能数据（T6需要）
    avg_response_time: Optional[float] = Field(None, description="平均响应时间（秒）")
    
    # 元数据
    type: str = Field(default="ai_agent", const=True, description="节点类型标识")
    created_at: Optional[datetime] = Field(None, description="Bot创建时间")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "wuyun_bot",
                "bot_name": "无云",
                "creator_uid": "eca0702f83e048c7b6151b21b1a3b9de",
                "capabilities": ["code_review", "testing"],
                "functional_tags": ["跨团队连接", "信息聚合", "高活跃"],
                "avg_response_time": 8.5,
                "type": "ai_agent"
            }
        }
```

---

### 3.3 Edge（边）

```python
from typing import Literal

class Edge(BaseModel):
    """
    网络边（连接关系）
    """
    # 基础连接
    source: str = Field(..., description="起始节点ID")
    target: str = Field(..., description="目标节点ID")
    
    # 边类型（用于人机协作分析）
    edge_type: Literal["H2H", "H2B", "B2H", "B2B"] = Field(..., description="边类型")
    
    # 权重（消息数，T3需要）
    weight: int = Field(default=1, description="边权重（消息数）")
    
    # 跨团队标识（L1.6需要）
    is_cross_team: bool = Field(default=False, description="是否跨团队边")
    
    # 详细消息列表（可选，用于深度分析）
    message_ids: List[str] = Field(default_factory=list, description="该边的所有消息ID")
    
    # 元数据
    first_interaction: Optional[datetime] = Field(None, description="首次交互时间")
    last_interaction: Optional[datetime] = Field(None, description="最后交互时间")
    
    class Config:
        json_schema_extra = {
            "example": {
                "source": "71e2a58ecce04aba972ce73c72b89f64",
                "target": "wuyun_bot",
                "edge_type": "H2B",
                "weight": 156,
                "is_cross_team": False,
                "message_ids": ["msg_001", "msg_002", "..."],
                "first_interaction": "2026-03-01T10:00:00Z",
                "last_interaction": "2026-03-18T18:30:00Z"
            }
        }
```

---

### 3.4 Message（消息）

```python
class Message(BaseModel):
    """
    ONA消息模型 - Beta v1.0
    
    设计原则：
    1. 聚焦交互关系（谁→谁），而非平台细节
    2. 保留必要的溯源和聚合字段（Optional）
    3. 简洁优先，遇到问题再扩展
    """
    # === 核心：交互关系 ===
    id: str = Field(..., description="消息唯一ID")
    from_uid: str = Field(..., description="发送者UID")
    to_uids: List[str] = Field(..., description="接收者UID列表（可能多个）")
    
    # === 内容 ===
    content: str = Field(..., description="消息文本内容（品鉴识别需要）")
    timestamp: datetime = Field(..., description="消息发送时间")
    
    # === 关系链 ===
    reply_to: Optional[str] = Field(None, description="回复的消息ID（响应时间计算需要）")
    
    # === 辅助：溯源和聚合（可选）===
    platform: Optional[str] = Field(None, description="数据来源平台（dmwork/slack/discord）")
    context_id: Optional[str] = Field(None, description="上下文ID（频道/群组/话题，用于聚合分析）")
    
    # === Layer 3标注（分析后回填）===
    is_connoisseurship: Optional[bool] = Field(None, description="是否为品鉴消息（Layer 3标注）")
    connoisseurship_score: Optional[float] = Field(None, description="品鉴得分（规则式算法）")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "msg_001",
                "from_uid": "user_a",
                "to_uids": ["wuyun_bot"],
                "content": "这个UI排版有问题，太拥挤了",
                "timestamp": "2026-03-15T14:30:00Z",
                "reply_to": None,
                "platform": "dmwork",
                "context_id": "ch_product_team",
                "is_connoisseurship": True,
                "connoisseurship_score": 3.0
            }
        }
    
    def get_all_participants(self) -> List[str]:
        """
        获取该消息的所有参与者（发送者+接收者）
        """
        return [self.from_uid] + self.to_uids
```

---

### 3.5 NetworkGraph（网络图容器）

```python
from typing import Dict

class NetworkGraph(BaseModel):
    """
    网络图数据容器（序列化NetworkX图）
    """
    # 基础信息
    graph_id: str = Field(..., description="图ID（通常是时间范围+团队）")
    description: str = Field(..., description="图描述")
    
    # 时间范围
    start_time: datetime = Field(..., description="数据起始时间")
    end_time: datetime = Field(..., description="数据结束时间")
    
    # 节点列表
    human_nodes: List[HumanNode] = Field(default_factory=list)
    ai_agent_nodes: List[AIAgentNode] = Field(default_factory=list)
    
    # 边列表
    edges: List[Edge] = Field(default_factory=list)
    
    # 消息列表（可选，可能很大）
    messages: Optional[List[Message]] = Field(None, description="消息列表（可选存储）")
    
    # 统计摘要
    summary: Dict[str, int] = Field(default_factory=dict, description="统计摘要")
    
    # 元数据
    created_at: datetime = Field(default_factory=datetime.utcnow)
    platform_sources: List[str] = Field(default_factory=list, description="数据来源平台")
    
    class Config:
        json_schema_extra = {
            "example": {
                "graph_id": "octo_team_2026-03-01_to_2026-03-18",
                "description": "Octo团队2026年3月1日-18日协作网络",
                "start_time": "2026-03-01T00:00:00Z",
                "end_time": "2026-03-18T23:59:59Z",
                "human_nodes": ["..."],
                "ai_agent_nodes": ["..."],
                "edges": ["..."],
                "summary": {
                    "total_nodes": 15,
                    "human_nodes": 7,
                    "ai_nodes": 8,
                    "total_edges": 194,
                    "total_messages": 33770
                },
                "platform_sources": ["dmwork", "discord"]
            }
        }
    
    def to_networkx(self) -> "nx.Graph":
        """
        转换为NetworkX图对象
        """
        import networkx as nx
        
        # 创建有向图
        G = nx.DiGraph()
        
        # 添加人类节点
        for node in self.human_nodes:
            G.add_node(node.id, **node.dict())
        
        # 添加AI节点
        for node in self.ai_agent_nodes:
            G.add_node(node.id, **node.dict())
        
        # 添加边
        for edge in self.edges:
            G.add_edge(edge.source, edge.target, **edge.dict())
        
        return G
    
    @classmethod
    def from_networkx(cls, G: "nx.Graph", graph_id: str, **kwargs) -> "NetworkGraph":
        """
        从NetworkX图创建NetworkGraph对象
        """
        human_nodes = []
        ai_agent_nodes = []
        edges = []
        
        # 提取节点
        for node_id, data in G.nodes(data=True):
            if data.get('type') == 'human':
                human_nodes.append(HumanNode(id=node_id, **data))
            elif data.get('type') == 'ai_agent':
                ai_agent_nodes.append(AIAgentNode(id=node_id, **data))
        
        # 提取边
        for u, v, data in G.edges(data=True):
            edges.append(Edge(source=u, target=v, **data))
        
        return cls(
            graph_id=graph_id,
            human_nodes=human_nodes,
            ai_agent_nodes=ai_agent_nodes,
            edges=edges,
            **kwargs
        )
```

---

## 四、辅助数据结构

### 4.1 Issue（可选，L3.3需要）

```python
class Issue(BaseModel):
    """
    Issue实体（GitHub/项目管理系统）
    """
    id: str
    title: str
    created_at: datetime
    creator_uid: str
    status: str  # open/closed
    labels: List[str] = Field(default_factory=list)
    
    # 关联的品鉴消息（可选）
    triggered_by_message_id: Optional[str] = None
```

### 4.2 PullRequest（可选，L3.3需要）

```python
class PullRequest(BaseModel):
    """
    PR实体
    """
    id: str
    title: str
    created_at: datetime
    author_uid: str
    status: str  # open/merged/closed
    
    # 关联的Issue或品鉴
    related_issue_ids: List[str] = Field(default_factory=list)
    triggered_by_message_id: Optional[str] = None
```

### 4.3 Channel（可选，辅助数据）

```python
class Channel(BaseModel):
    """
    频道/群组
    """
    id: str
    name: str
    type: str  # group/dm/channel
    member_ids: List[str] = Field(default_factory=list)
    created_at: datetime
```

---

## 五、数据验证规则

### 5.1 节点验证

```python
from pydantic import validator

class HumanNode(BaseModel):
    # ... (前面定义的字段)
    
    @validator('id')
    def validate_id(cls, v):
        if not v or len(v) < 8:
            raise ValueError('ID must be at least 8 characters')
        return v
    
    @validator('team')
    def validate_team(cls, v):
        if v:
            allowed_teams = ['产品', '研发', '测试', '运营']  # 示例
            if v not in allowed_teams:
                # 允许但警告
                pass
        return v
```

### 5.2 边验证

```python
class Edge(BaseModel):
    # ... (前面定义的字段)
    
    @validator('edge_type')
    def validate_edge_type(cls, v, values):
        # 根据source和target的type推断edge_type
        # 需要在构建时传入节点信息
        return v
    
    @validator('weight')
    def validate_weight(cls, v):
        if v < 1:
            raise ValueError('Edge weight must be at least 1')
        return v
```

### 5.3 消息验证

```python
class Message(BaseModel):
    # ... (前面定义的字段)
    
    @validator('content')
    def validate_content(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Message content cannot be empty')
        return v
    
    @validator('timestamp')
    def validate_timestamp(cls, v):
        # 确保时间不在未来
        if v > datetime.utcnow():
            raise ValueError('Message timestamp cannot be in the future')
        return v
```

---

## 六、数据持久化

### 6.1 JSON存储（简单方案）

```python
# 保存
network_graph = NetworkGraph(...)
with open('octo_network.json', 'w') as f:
    f.write(network_graph.json(indent=2))

# 加载
with open('octo_network.json', 'r') as f:
    network_graph = NetworkGraph.parse_raw(f.read())
```

### 6.2 数据库存储（可选，大规模数据）

**关系数据库（PostgreSQL）**:
```sql
CREATE TABLE human_nodes (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    team VARCHAR(100),
    email VARCHAR(255),
    created_at TIMESTAMP
);

CREATE TABLE ai_agent_nodes (
    id VARCHAR(64) PRIMARY KEY,
    bot_name VARCHAR(255) NOT NULL,
    creator_uid VARCHAR(64),
    avg_response_time FLOAT,
    created_at TIMESTAMP
);

CREATE TABLE edges (
    id SERIAL PRIMARY KEY,
    source VARCHAR(64) NOT NULL,
    target VARCHAR(64) NOT NULL,
    edge_type VARCHAR(10) NOT NULL,
    weight INT DEFAULT 1,
    is_cross_team BOOLEAN DEFAULT FALSE,
    first_interaction TIMESTAMP,
    last_interaction TIMESTAMP
);

CREATE TABLE messages (
    id VARCHAR(64) PRIMARY KEY,
    from_uid VARCHAR(64) NOT NULL,
    channel_id VARCHAR(64),
    content TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    reply_to VARCHAR(64),
    is_connoisseurship BOOLEAN,
    platform VARCHAR(50)
);
```

**图数据库（Neo4j，可选）**:
```cypher
// 创建人类节点
CREATE (h:Human {
    id: '71e2a58e...',
    name: '黄楠',
    role: 'Product Owner',
    team: '产品'
})

// 创建Bot节点
CREATE (b:AIAgent {
    id: 'wuyun_bot',
    bot_name: '无云',
    creator_uid: 'eca0702f...'
})

// 创建边
CREATE (h)-[:INTERACTS_WITH {weight: 156, edge_type: 'H2B'}]->(b)
```

---

## 七、数据流转

### Layer 1 → Layer 2

```python
# Layer 1适配器输出
raw_data = {
    "users": [...],
    "messages": [...],
    "channels": [...]
}

# Layer 2转换
def transform_to_network_graph(raw_data: dict) -> NetworkGraph:
    """
    将Layer 1原始数据转换为NetworkGraph
    """
    # 1. 构建节点
    human_nodes = []
    ai_nodes = []
    
    for user in raw_data['users']:
        if user['is_bot']:
            ai_nodes.append(AIAgentNode(
                id=user['id'],
                bot_name=user['name'],
                creator_uid=user.get('creator_uid')
            ))
        else:
            human_nodes.append(HumanNode(
                id=user['id'],
                name=user['name'],
                role=user.get('role'),
                team=user.get('team')
            ))
    
    # 2. 构建边（从消息聚合）
    edges = build_edges_from_messages(raw_data['messages'])
    
    # 3. 构建NetworkGraph
    return NetworkGraph(
        graph_id="...",
        human_nodes=human_nodes,
        ai_agent_nodes=ai_nodes,
        edges=edges,
        messages=[Message(**m) for m in raw_data['messages']]
    )
```

### Layer 2 → Layer 3/4

```python
# Layer 2输出
network_graph = NetworkGraph.parse_file('octo_network.json')

# Layer 3使用
G = network_graph.to_networkx()

# Layer 4指标计算
degree_centrality = nx.degree_centrality(G)
betweenness_centrality = nx.betweenness_centrality(G)
```

---

## 八、完整示例

```python
# 创建一个完整的NetworkGraph示例
network = NetworkGraph(
    graph_id="octo_2026_03",
    description="Octo团队3月协作网络",
    start_time=datetime(2026, 3, 1),
    end_time=datetime(2026, 3, 18),
    
    human_nodes=[
        HumanNode(
            id="71e2a58e...",
            name="黄楠",
            role="Product Owner",
            team="产品"
        ),
        HumanNode(
            id="f6f40587...",
            name="嘉伟",
            role="Tech Lead",
            team="研发"
        )
    ],
    
    ai_agent_nodes=[
        AIAgentNode(
            id="wuyun_bot",
            bot_name="无云",
            creator_uid="eca0702f...",
            functional_tags=["跨团队连接", "信息聚合"],
            avg_response_time=8.5
        )
    ],
    
    edges=[
        Edge(
            source="71e2a58e...",
            target="wuyun_bot",
            edge_type="H2B",
            weight=156,
            is_cross_team=False
        )
    ],
    
    summary={
        "total_nodes": 8,
        "human_nodes": 2,
        "ai_nodes": 1,
        "total_edges": 1,
        "total_messages": 156
    }
)

# 保存
with open('octo_network.json', 'w') as f:
    f.write(network.json(indent=2))

# 转换为NetworkX
G = network.to_networkx()
print(f"Nodes: {G.number_of_nodes()}, Edges: {G.number_of_edges()}")
```

---

## 九、下一步

**Layer 2数据模型已完成。**

**接下来可以**:
1. **实现Layer 1适配器** — DMWork数据提取
2. **实现数据转换** — raw_data → NetworkGraph
3. **实现Layer 3/4算法** — 基于NetworkGraph计算指标
4. **或者其他**？

---

**变更记录**:
- 2026-03-19: v1.0初始版本，定义5个核心实体（HumanNode, AIAgentNode, Edge, Message, NetworkGraph）
