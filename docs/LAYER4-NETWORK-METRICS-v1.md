# OCTO-ONA L1基础指标算法规范 v1.0

**更新时间**: 2026-03-19  
**聚焦**: L1网络基础指标（8个）详细算法定义

---

## 一、总览

### L1基础指标清单

| ID | 指标名称 | 英文 | 核心算法 | 优先级 |
|----|---------|------|---------|--------|
| L1.1 | 度中心性 | Degree Centrality | NetworkX | P0 |
| L1.2 | 中介中心性 | Betweenness Centrality | NetworkX | P0 |
| L1.3 | 接近中心性 | Closeness Centrality | NetworkX | P1 |
| L1.4 | 网络密度 | Network Density | 2E/(N(N-1)) | P0 |
| L1.5 | 领导层距离 | Leadership Distance | BFS搜索 | P0 |
| L1.6 | 孤岛指数 | Silo Index | 社区检测 | P0 |
| L1.7 | 过载风险 | Burnout Risk | BC阈值统计 | P0 |
| L1.8 | 瓶颈风险 | Bottleneck Risk | 桥检测 | P1 |

---

## 二、P0指标详细定义（6个核心）

### L1.1 度中心性 (Degree Centrality)

**公式**: DC(v) = deg(v) / (N - 1)  
**值域**: [0, 1]  
**业务含义**: 节点活跃度，社交中心

**算法**:
```python
import networkx as nx

def calculate_degree_centrality(graph: nx.Graph) -> Dict[str, float]:
    return nx.degree_centrality(graph)
```

**健康范围**:
- 3% Super-Connectors: DC > 0.7
- 普通员工: DC = 0.2-0.5

---

### L1.2 中介中心性 (Betweenness Centrality)

**公式**: BC(v) = Σ [σst(v) / σst]  
**值域**: [0, 1]  
**业务含义**: 桥梁/瓶颈程度

**算法**:
```python
def calculate_betweenness_centrality(graph: nx.Graph) -> Dict[str, float]:
    return nx.betweenness_centrality(graph, normalized=True)
```

**健康范围**:
- BC > 0.5: 单点故障风险
- BC = 0.3-0.5: 关键桥梁
- BC < 0.2: 普通节点

---

### L1.4 网络密度 (Network Density)

**公式**: Density = 2E / (N(N-1))  
**值域**: [0, 1]  
**业务含义**: 网络紧密度

**算法**:
```python
def calculate_network_density(graph: nx.Graph) -> float:
    return nx.density(graph)
```

**健康范围**:
- 创业公司: 0.5-0.7
- 中型公司: 0.3-0.5
- 大型公司: 0.1-0.3

---

### L1.5 领导层距离 (Leadership Distance)

**公式**: LD = (2步内可达决策层人数) / (非决策层人数) × 100%  
**值域**: [0, 100%]  
**业务含义**: 组织扁平度

**算法**:
```python
def calculate_leadership_distance(graph: nx.Graph, 
                                   leadership_nodes: List[str]) -> float:
    human_nodes = [n for n, d in graph.nodes(data=True) 
                   if d.get('type') == 'human']
    non_leadership = [n for n in human_nodes if n not in leadership_nodes]
    
    reachable = sum(1 for n in non_leadership 
                    if is_within_2_hops(n, leadership_nodes, graph))
    
    return (reachable / len(non_leadership)) * 100 if non_leadership else 100
```

**健康范围**:
- 优秀: 85-90%
- 良好: 70-85%
- 需改进: <70%

---

### L1.6 孤岛指数 (Silo Index)

**公式**: Silo Index = (弱连接团队数) / (总团队数) × 100%  
**值域**: [0, 100%]  
**业务含义**: 团队孤立程度

**算法**:
```python
def calculate_silo_index(graph: nx.Graph) -> float:
    teams = {d.get('team') for n, d in graph.nodes(data=True) 
             if d.get('type') == 'human' and d.get('team')}
    
    # 计算各团队跨团队边数
    team_cross_edges = {team: 0 for team in teams}
    for u, v in graph.edges():
        if graph.nodes[u].get('team') != graph.nodes[v].get('team'):
            team_cross_edges[graph.nodes[u].get('team')] += 1
            team_cross_edges[graph.nodes[v].get('team')] += 1
    
    avg = sum(team_cross_edges.values()) / len(teams)
    weak_teams = [t for t, c in team_cross_edges.items() if c < avg * 0.5]
    
    return (len(weak_teams) / len(teams)) * 100
```

**健康范围**:
- 优秀: <5%
- 良好: 5-10%
- 需改进: >10%

---

### L1.7 过载风险 (Burnout Risk)

**公式**: Count(BC(v) > 0.3)  
**值域**: 人数  
**业务含义**: 过载风险人员数

**算法**:
```python
def identify_burnout_risks(graph: nx.Graph, threshold=0.3) -> List[str]:
    bc = nx.betweenness_centrality(graph)
    return [n for n, v in bc.items() 
            if graph.nodes[n].get('type') == 'human' and v > threshold]
```

**健康范围**:
- 占比2-5%: 健康
- 占比>5%: 风险

---

## 三、P1指标（2个补充）

### L1.3 接近中心性

**公式**: CC(v) = (N-1) / Σd(v, u)  
**算法**: `nx.closeness_centrality(graph)`

### L1.8 瓶颈风险

**定义**: 桥节点数  
**算法**: `nx.bridges(graph)`

---

## 四、实施路线图（3周）

**Week 1**: L1.1/L1.2/L1.3 (中心性指标)  
**Week 2**: L1.4/L1.5/L1.6 (全局指标)  
**Week 3**: L1.7/L1.8 (风险指标)

---

## 五、数据需求

**节点属性**:
- `type`: "human" | "ai_agent"
- `team`: str (L1.6)
- `role`: str (L1.5)

**图结构**: 连通图，支持NetworkX算法

---

**下一步**: 继续L3品鉴指标算法设计
