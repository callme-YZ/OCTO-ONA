# OCTO-ONA Layer 3 分析引擎设计 v1.0

**更新时间**: 2026-03-19  
**设计原则**: 从数据模型到指标 - 图算法 + 品鉴识别

---

## 一、总览

### 核心功能

```
Layer 2数据（NetworkGraph）
   ↓
图分析（NetworkX）
   ↓
品鉴识别（规则式/LLM）
   ↓
Layer 4指标输入
```

### 设计目标

1. **图算法封装** — 统一调用NetworkX
2. **品鉴识别** — 规则式优先，LLM备选
3. **可扩展** — 易于添加新分析方法
4. **高性能** — 大规模网络（1000+节点）

---

## 二、AnalysisEngine架构

### 2.1 核心类设计

```python
from typing import Dict, List, Optional
import networkx as nx
from octo_ona.layer2 import NetworkGraph, Message

class AnalysisEngine:
    """
    Layer 3分析引擎
    
    职责：
    1. 执行图算法（调用NetworkX）
    2. 识别品鉴消息
    3. 为Layer 4提供中间数据
    """
    
    def __init__(self, network_graph: NetworkGraph):
        """
        初始化分析引擎
        
        Args:
            network_graph: Layer 2的NetworkGraph对象
        """
        self.network_graph = network_graph
        self.G = network_graph.to_networkx()  # 转换为NetworkX图
        
        # 缓存计算结果
        self._cache = {}
    
    # === 图算法模块 ===
    
    def compute_centrality(self) -> Dict[str, Dict[str, float]]:
        """
        计算所有中心性指标
        
        Returns:
            {
                'degree': {node_id: value, ...},
                'betweenness': {node_id: value, ...},
                'closeness': {node_id: value, ...}
            }
        """
        if 'centrality' in self._cache:
            return self._cache['centrality']
        
        centrality = {
            'degree': nx.degree_centrality(self.G),
            'betweenness': nx.betweenness_centrality(self.G),
            'closeness': nx.closeness_centrality(self.G)
        }
        
        self._cache['centrality'] = centrality
        return centrality
    
    def detect_communities(self, method: str = 'louvain') -> Dict[str, int]:
        """
        社区检测
        
        Args:
            method: 检测算法（louvain/label_propagation）
        
        Returns:
            {node_id: community_id, ...}
        """
        if method == 'louvain':
            import community as community_louvain
            return community_louvain.best_partition(self.G.to_undirected())
        elif method == 'label_propagation':
            communities = nx.community.label_propagation_communities(self.G.to_undirected())
            return {node: i for i, comm in enumerate(communities) for node in comm}
        else:
            raise ValueError(f"Unknown method: {method}")
    
    def find_bridges(self) -> List[tuple]:
        """
        识别桥边（Bridge Edges）
        
        Returns:
            [(source, target), ...]
        """
        return list(nx.bridges(self.G.to_undirected()))
    
    def calculate_shortest_paths(self, source: Optional[str] = None) -> Dict:
        """
        计算最短路径
        
        Args:
            source: 起始节点（None表示计算所有节点对）
        
        Returns:
            最短路径字典
        """
        if source:
            return nx.single_source_shortest_path_length(self.G, source)
        else:
            return dict(nx.all_pairs_shortest_path_length(self.G))
    
    # === Hub Score计算模块 ===
    
    def calculate_hub_score(self) -> Dict[str, float]:
        """
        计算Hub Score（OCTO核心指标）
        
        Hub Score = mentions_received / messages_sent
        
        含义：影响力 vs 活跃度比率
        - 高Hub Score: 被动影响力强（被咨询多，发言少）
        - 低Hub Score: 主动执行者（发言多，被咨询少）
        
        Returns:
            {node_id: hub_score, ...}
        """
        mentions = {}  # {node_id: count}
        messages_sent = {}  # {node_id: count}
        
        for msg in self.network_graph.messages or []:
            # 统计发送消息
            messages_sent[msg.from_uid] = messages_sent.get(msg.from_uid, 0) + 1
            
            # 统计被@（to_uids中的每个人都算被@）
            for mentioned_uid in msg.to_uids:
                mentions[mentioned_uid] = mentions.get(mentioned_uid, 0) + 1
        
        # 计算Hub Score
        hub_scores = {}
        all_nodes = set(list(mentions.keys()) + list(messages_sent.keys()))
        
        for uid in all_nodes:
            mention_count = mentions.get(uid, 0)
            sent_count = messages_sent.get(uid, 0)
            
            if sent_count == 0:
                # 特殊情况：只被@，不发言
                hub_scores[uid] = float('inf') if mention_count > 0 else 0.0
            else:
                hub_scores[uid] = mention_count / sent_count
        
        return hub_scores
    
    def identify_connoisseurs_by_hub_score(self, 
                                            threshold: float = 1.0) -> List[str]:
        """
        基于Hub Score识别品鉴者（被动品鉴）
        
        Args:
            threshold: Hub Score阈值（默认1.0，即被@多于发言）
        
        Returns:
            品鉴者UID列表
        """
        hub_scores = self.calculate_hub_score()
        
        connoisseurs = [
            uid for uid, score in hub_scores.items()
            if score >= threshold and score != float('inf')
        ]
        
        return connoisseurs
    
    # === 品鉴识别模块 ===
    
    def identify_connoisseurship(self, 
                                  method: str = 'rule_based') -> List[Message]:
        """
        识别品鉴消息
        
        Args:
            method: 识别方法（rule_based/llm）
        
        Returns:
            品鉴消息列表（is_connoisseurship=True）
        """
        if method == 'rule_based':
            return self._rule_based_connoisseurship()
        elif method == 'llm':
            return self._llm_based_connoisseurship()
        else:
            raise ValueError(f"Unknown method: {method}")
    
    def _rule_based_connoisseurship(self) -> List[Message]:
        """
        规则式品鉴识别
        
        Returns:
            品鉴消息列表
        """
        connoisseurship_messages = []
        
        for msg in self.network_graph.messages or []:
            score = self._calculate_connoisseurship_score(msg.content)
            
            if score >= 2.0:  # 阈值：至少2个维度
                msg.is_connoisseurship = True
                msg.connoisseurship_score = score
                connoisseurship_messages.append(msg)
        
        return connoisseurship_messages
    
    def _calculate_connoisseurship_score(self, content: str) -> float:
        """
        计算品鉴得分（规则式）
        
        基于4个维度：
        1. 评价性（好/不好/优秀/糟糕）
        2. 批判性（问题/错误/bug）
        3. 对比性（比...更...）
        4. 品味性（体验/感觉/风格）
        
        Args:
            content: 消息文本
        
        Returns:
            得分（0-4分）
        """
        score = 0.0
        
        # 维度1: 评价性
        evaluative_keywords = [
            '好', '不好', '很好', '非常好', '优秀', '糟糕', '差',
            '棒', '赞', '完美', '不错', '太差', '不行'
        ]
        if any(kw in content for kw in evaluative_keywords):
            score += 1.0
        
        # 维度2: 批判性
        critical_keywords = [
            '问题', '错误', 'bug', 'Bug', 'BUG',
            '不对', '有问题', '不合理', '不应该',
            '缺陷', '漏洞', '隐患'
        ]
        if any(kw in content for kw in critical_keywords):
            score += 1.0
        
        # 维度3: 对比性
        comparative_patterns = ['比', '更', '没有', '不如', '优于', '劣于']
        if any(pattern in content for pattern in comparative_patterns):
            score += 1.0
        
        # 维度4: 品味性
        aesthetic_keywords = [
            '体验', '感觉', '风格', '美观', '设计',
            '舒服', '难受', '别扭', '顺畅', '流畅',
            '简洁', '复杂', '清晰', '混乱'
        ]
        if any(kw in content for kw in aesthetic_keywords):
            score += 1.0
        
        return score
    
    def _llm_based_connoisseurship(self) -> List[Message]:
        """
        LLM增强品鉴识别（Phase 2可选）
        
        Returns:
            品鉴消息列表
        """
        # TODO: 集成LLM API
        # 1. 批量发送消息给LLM
        # 2. 要求LLM判断是否为品鉴（0-1分数）
        # 3. 阈值筛选（>0.7为品鉴）
        
        raise NotImplementedError("LLM方法将在Phase 2实现")
    
    # === 辅助分析模块 ===
    
    def get_node_neighbors(self, node_id: str, depth: int = 1) -> List[str]:
        """
        获取节点的N层邻居
        
        Args:
            node_id: 节点ID
            depth: 深度（1=直接邻居，2=二层网络）
        
        Returns:
            邻居节点ID列表
        """
        if depth == 1:
            return list(self.G.neighbors(node_id))
        else:
            # BFS获取N层邻居
            neighbors = set()
            current_layer = {node_id}
            
            for _ in range(depth):
                next_layer = set()
                for node in current_layer:
                    next_layer.update(self.G.neighbors(node))
                neighbors.update(next_layer)
                current_layer = next_layer
            
            neighbors.discard(node_id)  # 排除自己
            return list(neighbors)
    
    def get_ego_network(self, node_id: str, radius: int = 1) -> nx.Graph:
        """
        获取以某节点为中心的子图（ego network）
        
        Args:
            node_id: 中心节点
            radius: 半径（通常为1或2）
        
        Returns:
            NetworkX子图
        """
        return nx.ego_graph(self.G, node_id, radius=radius)
    
    def calculate_response_time(self, 
                                 bot_messages: List[Message]) -> Dict[str, float]:
        """
        计算Bot响应时间
        
        Args:
            bot_messages: Bot发送的消息列表
        
        Returns:
            {bot_id: avg_response_time_seconds, ...}
        """
        response_times = {}
        
        # 构建消息ID到消息的映射
        msg_dict = {msg.id: msg for msg in self.network_graph.messages or []}
        
        for msg in bot_messages:
            if msg.reply_to and msg.reply_to in msg_dict:
                original_msg = msg_dict[msg.reply_to]
                response_time = (msg.timestamp - original_msg.timestamp).total_seconds()
                
                bot_id = msg.from_uid
                if bot_id not in response_times:
                    response_times[bot_id] = []
                response_times[bot_id].append(response_time)
        
        # 计算平均值
        return {
            bot_id: sum(times) / len(times)
            for bot_id, times in response_times.items()
        }
```

---

## 三、品鉴识别详细设计

### 3.1 规则式算法（Phase 1）

#### **关键词库**

**基于Octo真实案例**（从刘乐君的品鉴消息中提取）:

```python
CONNOISSEURSHIP_KEYWORDS = {
    # 维度1: 评价性
    'evaluative': [
        '好', '不好', '很好', '非常好', '优秀', '糟糕', '差',
        '棒', '赞', '完美', '不错', '太差', '不行', '可以',
        '还行', '一般', '马马虎虎'
    ],
    
    # 维度2: 批判性
    'critical': [
        '问题', '错误', 'bug', 'Bug', 'BUG',
        '不对', '有问题', '不合理', '不应该',
        '缺陷', '漏洞', '隐患', '风险',
        '需要改进', '需要优化', '建议修改'
    ],
    
    # 维度3: 对比性
    'comparative': [
        '比', '更', '没有', '不如', '优于', '劣于',
        '相比', '对比', '而言', '相对'
    ],
    
    # 维度4: 品味性
    'aesthetic': [
        '体验', '感觉', '风格', '美观', '设计',
        '舒服', '难受', '别扭', '顺畅', '流畅',
        '简洁', '复杂', '清晰', '混乱', '整洁',
        '排版', '布局', '配色', '字体'
    ]
}
```

#### **上下文验证**

**问题**: 单纯关键词匹配会误判

**例子**:
- ✅ "这个UI排版有问题" — 品鉴
- ❌ "好的，我知道了" — 不是品鉴（只有"好"）

**解决**: 上下文验证

```python
def _validate_context(self, content: str, score: float) -> bool:
    """
    上下文验证，避免误判
    
    Args:
        content: 消息文本
        score: 初步得分
    
    Returns:
        是否真的是品鉴
    """
    # 规则1: 太短的消息（<5字）不是品鉴
    if len(content) < 5:
        return False
    
    # 规则2: 纯礼貌用语不是品鉴
    polite_phrases = ['好的', '知道了', '收到', '明白', 'OK', 'ok', '谢谢']
    if content.strip() in polite_phrases:
        return False
    
    # 规则3: 得分≥2且长度≥10字
    if score >= 2.0 and len(content) >= 10:
        return True
    
    # 规则4: 得分≥3（即使较短也算品鉴）
    if score >= 3.0:
        return True
    
    return False
```

---

### 3.2 LLM增强（Phase 2，可选）

#### **API调用设计**

```python
import openai

class LLMConnoisseurshipDetector:
    """
    LLM品鉴检测器
    """
    
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model
    
    def detect(self, messages: List[Message]) -> List[Message]:
        """
        批量检测品鉴消息
        
        Args:
            messages: 消息列表
        
        Returns:
            品鉴消息列表
        """
        # 批量发送（每次100条）
        batch_size = 100
        connoisseurship_messages = []
        
        for i in range(0, len(messages), batch_size):
            batch = messages[i:i+batch_size]
            results = self._detect_batch(batch)
            connoisseurship_messages.extend(results)
        
        return connoisseurship_messages
    
    def _detect_batch(self, messages: List[Message]) -> List[Message]:
        """
        批量检测一批消息
        """
        prompt = self._build_prompt(messages)
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "你是一个品鉴消息识别专家。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )
        
        # 解析结果
        results = self._parse_response(response.choices[0].message.content)
        
        # 标注消息
        for msg, is_connoisseurship in zip(messages, results):
            if is_connoisseurship:
                msg.is_connoisseurship = True
        
        return [msg for msg in messages if msg.is_connoisseurship]
    
    def _build_prompt(self, messages: List[Message]) -> str:
        """
        构建检测prompt
        """
        prompt = """请判断以下消息是否为"品鉴"（专业判断/评价/反馈）。

品鉴的特征：
1. 评价性：表达好/不好的判断
2. 批判性：指出问题/错误
3. 对比性：进行比较
4. 品味性：关于体验/设计/美观

对于每条消息，回答"是"或"否"（一行一个）。

消息列表：
"""
        for i, msg in enumerate(messages, 1):
            prompt += f"{i}. {msg.content}\n"
        
        return prompt
    
    def _parse_response(self, response_text: str) -> List[bool]:
        """
        解析LLM返回结果
        """
        lines = response_text.strip().split('\n')
        return [line.strip() == '是' for line in lines]
```

---

## 四、图算法配置

### 4.1 中心性算法

**NetworkX默认参数**（无需修改）:
```python
# Degree Centrality
nx.degree_centrality(G)  # 归一化：deg(v) / (N-1)

# Betweenness Centrality
nx.betweenness_centrality(G, normalized=True)  # 归一化

# Closeness Centrality
nx.closeness_centrality(G)  # 倒数距离和
```

---

### 4.2 社区检测

**Louvain算法**（推荐）:
```python
import community as community_louvain

# 社区检测
partition = community_louvain.best_partition(G.to_undirected())

# 计算模块度
modularity = community_louvain.modularity(partition, G.to_undirected())
```

**优点**: 快速、准确、适合大规模网络

---

### 4.3 性能优化

**大规模网络（1000+节点）**:
```python
# 1. 使用稀疏图表示
G = nx.DiGraph()  # 有向图（更高效）

# 2. 并行计算中心性
from joblib import Parallel, delayed

def parallel_betweenness(G, nodes):
    return nx.betweenness_centrality_subset(
        G, sources=nodes, targets=G.nodes()
    )

# 分块计算
node_chunks = [list(G.nodes())[i::4] for i in range(4)]  # 4核
results = Parallel(n_jobs=4)(
    delayed(parallel_betweenness)(G, chunk) 
    for chunk in node_chunks
)

# 3. 缓存结果
self._cache['betweenness'] = merge_results(results)
```

---

## 五、与Layer 2/4的交互

### 5.1 Layer 2 → Layer 3

```python
# Layer 2输出
network_graph = NetworkGraph.parse_file('network.json')

# Layer 3处理
engine = AnalysisEngine(network_graph)

# 执行分析
centrality = engine.compute_centrality()
connoisseurship_msgs = engine.identify_connoisseurship()
```

---

### 5.2 Layer 3 → Layer 4

```python
# Layer 3输出
analysis_results = {
    'centrality': engine.compute_centrality(),
    'communities': engine.detect_communities(),
    'bridges': engine.find_bridges(),
    'connoisseurship_messages': engine.identify_connoisseurship(),
    'response_times': engine.calculate_response_time(bot_messages)
}

# Layer 4使用
from octo_ona.layer4 import MetricsCalculator

calculator = MetricsCalculator(network_graph, analysis_results)
metrics = calculator.calculate_all()
```

---

## 六、实施优先级

### Phase 1: 核心图算法（1周）

**实现功能**:
- AnalysisEngine类
- compute_centrality()
- find_bridges()
- get_ego_network()

**产出**: 基础图分析能力

---

### Phase 2: 品鉴识别（1周）

**实现功能**:
- 规则式品鉴识别
- 关键词库（4维度）
- 上下文验证

**产出**: 品鉴识别能力

---

### Phase 3: 高级功能（1周）

**实现功能**:
- 社区检测
- 响应时间计算
- 性能优化（缓存、并行）

**产出**: 完整Layer 3

---

### Phase 4: LLM增强（可选）

**实现功能**:
- LLM API集成
- 批量检测
- 准确率对比（规则式 vs LLM）

**产出**: LLM增强版

---

## 七、测试与验证

### 7.1 图算法测试

```python
def test_centrality():
    # 构造简单测试图
    G = nx.DiGraph()
    G.add_edges_from([
        ('A', 'B'), ('A', 'C'),
        ('B', 'D'), ('C', 'D')
    ])
    
    network_graph = NetworkGraph.from_networkx(G, "test")
    engine = AnalysisEngine(network_graph)
    
    centrality = engine.compute_centrality()
    
    # 验证：D的Degree应该最高（2个入边）
    assert centrality['degree']['D'] > centrality['degree']['A']
```

---

### 7.2 品鉴识别测试

```python
def test_connoisseurship_detection():
    messages = [
        Message(id="1", from_uid="user1", to_uids=["user2"],
                content="这个UI排版有问题，太拥挤了", 
                timestamp=datetime.now()),
        Message(id="2", from_uid="user1", to_uids=["user2"],
                content="好的，知道了", 
                timestamp=datetime.now())
    ]
    
    network_graph = NetworkGraph(
        graph_id="test",
        messages=messages,
        # ...
    )
    
    engine = AnalysisEngine(network_graph)
    connoisseurship = engine.identify_connoisseurship()
    
    # 验证：只有第一条是品鉴
    assert len(connoisseurship) == 1
    assert connoisseurship[0].id == "1"
```

---

## 八、下一步

**Layer 3分析引擎设计完成。**

**接下来可以**:
1. **设计Layer 1数据适配器** — 最后一层设计
2. **总结整体设计文档**
3. **开始实施（编码）**

---

**变更记录**:
- 2026-03-19 v1.0: 初始版本，定义AnalysisEngine类、品鉴识别算法、图算法封装
- 2026-03-19 v1.1: 新增Hub Score计算模块（calculate_hub_score + identify_connoisseurs_by_hub_score）
