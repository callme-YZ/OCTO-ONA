# OCTO-ONA Layer 1 数据适配器设计 v1.0

**更新时间**: 2026-03-19  
**设计原则**: 轻量接口 + 参考实现 - 用户可扩展

---

## 一、总览

### 核心职责

```
原始数据源（数据库/API/文件）
   ↓
数据适配器（BaseAdapter）
   ↓
标准化数据（NetworkGraph）
   ↓
Layer 2
```

### 设计目标

1. **标准化接口** — 定义清晰的适配器基类
2. **参考实现** — DMWork适配器示例
3. **用户可扩展** — 用户可自行适配其他数据源

---

## 二、BaseAdapter接口

### 2.1 抽象基类

```python
from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from datetime import datetime
from octo_ona.layer2 import NetworkGraph, HumanNode, AIAgentNode, Message, Edge

class BaseAdapter(ABC):
    """
    数据适配器基类
    
    用户需要实现4个核心方法：
    1. fetch_users() — 获取用户列表
    2. fetch_messages() — 获取消息列表
    3. build_nodes() — 构建节点
    4. build_edges() — 构建边
    """
    
    def __init__(self, config: Dict):
        """
        初始化适配器
        
        Args:
            config: 配置字典（连接信息、过滤条件等）
        """
        self.config = config
    
    @abstractmethod
    def fetch_users(self) -> List[Dict]:
        """
        获取用户列表
        
        Returns:
            [
                {
                    'id': 'user_uid',
                    'name': '张三',
                    'is_bot': False,
                    'role': 'PM',
                    'team': '产品',
                    ...
                },
                ...
            ]
        """
        pass
    
    @abstractmethod
    def fetch_messages(self, 
                       start_time: Optional[datetime] = None,
                       end_time: Optional[datetime] = None) -> List[Dict]:
        """
        获取消息列表
        
        Args:
            start_time: 起始时间
            end_time: 结束时间
        
        Returns:
            [
                {
                    'id': 'msg_id',
                    'from_uid': 'user1',
                    'to_uids': ['user2', 'user3'],  # 接收者列表
                    'content': '消息内容',
                    'timestamp': datetime(...),
                    'reply_to': 'msg_xxx',  # 可选
                    'context_id': 'channel_id',  # 可选
                    ...
                },
                ...
            ]
        """
        pass
    
    def build_nodes(self, users: List[Dict]) -> tuple:
        """
        构建节点列表
        
        Args:
            users: fetch_users()返回的用户列表
        
        Returns:
            (human_nodes, ai_agent_nodes)
        """
        human_nodes = []
        ai_agent_nodes = []
        
        for user in users:
            if user.get('is_bot', False):
                ai_agent_nodes.append(AIAgentNode(
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
        
        return human_nodes, ai_agent_nodes
    
    def build_edges(self, messages: List[Dict]) -> List[Edge]:
        """
        从消息构建边
        
        Args:
            messages: fetch_messages()返回的消息列表
        
        Returns:
            边列表
        """
        edge_dict = {}  # {(source, target): weight}
        
        for msg in messages:
            source = msg['from_uid']
            targets = msg['to_uids']
            
            for target in targets:
                key = (source, target)
                if key not in edge_dict:
                    edge_dict[key] = 0
                edge_dict[key] += 1
        
        # 构建Edge对象
        edges = []
        for (source, target), weight in edge_dict.items():
            edges.append(Edge(
                source=source,
                target=target,
                edge_type=self._infer_edge_type(source, target),
                weight=weight
            ))
        
        return edges
    
    def _infer_edge_type(self, source: str, target: str) -> str:
        """
        推断边类型（H2H/H2B/B2H/B2B）
        
        需要子类覆盖或提供节点类型信息
        """
        # 默认实现：需要子类提供节点类型映射
        return "unknown"
    
    def to_network_graph(self,
                         start_time: Optional[datetime] = None,
                         end_time: Optional[datetime] = None,
                         graph_id: Optional[str] = None) -> NetworkGraph:
        """
        完整数据转换流程
        
        Args:
            start_time: 起始时间
            end_time: 结束时间
            graph_id: 图ID
        
        Returns:
            NetworkGraph对象
        """
        # 1. 获取原始数据
        users = self.fetch_users()
        messages = self.fetch_messages(start_time, end_time)
        
        # 2. 构建节点
        human_nodes, ai_agent_nodes = self.build_nodes(users)
        
        # 3. 构建消息对象
        message_objects = [
            Message(
                id=msg['id'],
                from_uid=msg['from_uid'],
                to_uids=msg['to_uids'],
                content=msg['content'],
                timestamp=msg['timestamp'],
                reply_to=msg.get('reply_to'),
                platform=self.config.get('platform'),
                context_id=msg.get('context_id')
            )
            for msg in messages
        ]
        
        # 4. 构建边
        edges = self.build_edges(messages)
        
        # 5. 构建NetworkGraph
        return NetworkGraph(
            graph_id=graph_id or f"{self.config.get('platform')}_{start_time}_{end_time}",
            description=f"Network from {start_time} to {end_time}",
            start_time=start_time or datetime.min,
            end_time=end_time or datetime.now(),
            human_nodes=human_nodes,
            ai_agent_nodes=ai_agent_nodes,
            edges=edges,
            messages=message_objects,
            platform_sources=[self.config.get('platform', 'unknown')]
        )
```

---

## 三、DMWork参考实现

### 3.1 DMWorkAdapter

```python
import pymysql
from typing import List, Dict, Optional
from datetime import datetime

class DMWorkAdapter(BaseAdapter):
    """
    DMWork数据适配器（参考实现）
    """
    
    def __init__(self, config: Dict):
        """
        初始化DMWork适配器
        
        Args:
            config: {
                'host': 'im-test.xming.ai',
                'port': 13306,
                'user': 'dmwork_ro',
                'password': '...',
                'database': 'im',
                'platform': 'dmwork'
            }
        """
        super().__init__(config)
        self.conn = pymysql.connect(
            host=config['host'],
            port=config['port'],
            user=config['user'],
            password=config['password'],
            database=config['database']
        )
    
    def fetch_users(self) -> List[Dict]:
        """
        从user表获取用户
        """
        cursor = self.conn.cursor(pymysql.cursors.DictCursor)
        
        # 查询用户
        cursor.execute("""
            SELECT uid AS id, name, robot AS is_bot, email
            FROM user
        """)
        
        users = cursor.fetchall()
        
        # 查询Bot的创建者
        cursor.execute("""
            SELECT uid AS id, creator_uid
            FROM robot
        """)
        
        robot_creators = {r['id']: r['creator_uid'] for r in cursor.fetchall()}
        
        # 合并数据
        for user in users:
            user['is_bot'] = bool(user['is_bot'])
            if user['is_bot']:
                user['creator_uid'] = robot_creators.get(user['id'])
        
        return users
    
    def fetch_messages(self,
                       start_time: Optional[datetime] = None,
                       end_time: Optional[datetime] = None) -> List[Dict]:
        """
        从5张message表获取消息
        """
        cursor = self.conn.cursor(pymysql.cursors.DictCursor)
        
        # DMWork有5张消息表：message, message1, message2, message3, message4
        tables = ['message', 'message1', 'message2', 'message3', 'message4']
        
        all_messages = []
        
        for table in tables:
            # 构建查询
            query = f"""
                SELECT 
                    message_id AS id,
                    from_uid,
                    channel_id AS context_id,
                    content,
                    created_at AS timestamp
                FROM {table}
                WHERE 1=1
            """
            
            params = []
            if start_time:
                query += " AND created_at >= %s"
                params.append(start_time)
            if end_time:
                query += " AND created_at <= %s"
                params.append(end_time)
            
            cursor.execute(query, params)
            messages = cursor.fetchall()
            all_messages.extend(messages)
        
        # 构建to_uids（简化版：从channel成员推断）
        for msg in all_messages:
            msg['to_uids'] = self._infer_recipients(msg)
        
        return all_messages
    
    def _infer_recipients(self, msg: Dict) -> List[str]:
        """
        推断消息接收者
        
        简化实现：返回channel的所有成员（排除发送者）
        """
        cursor = self.conn.cursor(pymysql.cursors.DictCursor)
        
        if msg.get('context_id'):
            # 查询channel成员
            cursor.execute("""
                SELECT uid
                FROM group_member
                WHERE group_no = %s AND uid != %s
            """, (msg['context_id'], msg['from_uid']))
            
            members = cursor.fetchall()
            return [m['uid'] for m in members]
        
        return []  # 无法推断
```

---

## 四、使用示例

### 4.1 DMWork数据提取

```python
# 配置
config = {
    'host': 'im-test.xming.ai',
    'port': 13306,
    'user': 'dmwork_ro',
    'password': 'your_password',
    'database': 'im',
    'platform': 'dmwork'
}

# 创建适配器
adapter = DMWorkAdapter(config)

# 提取数据
network_graph = adapter.to_network_graph(
    start_time=datetime(2026, 3, 1),
    end_time=datetime(2026, 3, 18),
    graph_id='octo_2026_03'
)

# 保存
with open('network.json', 'w') as f:
    f.write(network_graph.json(indent=2))
```

---

### 4.2 自定义适配器（Slack示例）

```python
class SlackAdapter(BaseAdapter):
    """
    Slack数据适配器（用户自定义）
    """
    
    def __init__(self, config: Dict):
        super().__init__(config)
        # 初始化Slack API客户端
        from slack_sdk import WebClient
        self.client = WebClient(token=config['token'])
    
    def fetch_users(self) -> List[Dict]:
        """
        从Slack API获取用户
        """
        response = self.client.users_list()
        users = []
        
        for member in response['members']:
            users.append({
                'id': member['id'],
                'name': member['real_name'],
                'is_bot': member['is_bot']
            })
        
        return users
    
    def fetch_messages(self, start_time=None, end_time=None) -> List[Dict]:
        """
        从Slack API获取消息
        """
        # 获取频道列表
        channels = self.client.conversations_list()['channels']
        
        messages = []
        for channel in channels:
            # 获取消息
            history = self.client.conversations_history(
                channel=channel['id'],
                oldest=start_time.timestamp() if start_time else None,
                latest=end_time.timestamp() if end_time else None
            )
            
            for msg in history['messages']:
                messages.append({
                    'id': msg['ts'],
                    'from_uid': msg['user'],
                    'to_uids': self._get_channel_members(channel['id']),
                    'content': msg['text'],
                    'timestamp': datetime.fromtimestamp(float(msg['ts'])),
                    'context_id': channel['id']
                })
        
        return messages
    
    def _get_channel_members(self, channel_id: str) -> List[str]:
        """获取频道成员"""
        response = self.client.conversations_members(channel=channel_id)
        return response['members']
```

---

## 五、to_uids构建规则（重要）

### 5.1 推断逻辑

**场景1: 群聊消息**
```python
# DMWork/Slack群聊
to_uids = [channel所有成员] - [发送者自己]
```

**场景2: @提及**
```python
# 如果消息有@提及
to_uids = [被@的人列表]
```

**场景3: 回复消息**
```python
# 如果是回复
original_msg = get_message(reply_to)
to_uids = [original_msg.from_uid]
```

**场景4: 单聊**
```python
# 单聊消息
to_uids = [接收者UID]
```

### 5.2 优先级

```python
def infer_recipients(msg: Dict, channel_members: Dict) -> List[str]:
    """
    推断接收者（优先级）
    
    1. mentions（@提及） — 最高优先级
    2. reply_to（回复） — 次优先级
    3. channel_members（群聊） — 默认
    """
    # 1. 如果有@提及
    if msg.get('mentions'):
        return msg['mentions']
    
    # 2. 如果是回复
    if msg.get('reply_to'):
        original = get_message(msg['reply_to'])
        return [original['from_uid']]
    
    # 3. 群聊（所有成员）
    if msg.get('context_id'):
        members = channel_members.get(msg['context_id'], [])
        return [m for m in members if m != msg['from_uid']]
    
    # 4. 无法推断
    return []
```

---

## 六、数据验证

### 6.1 必需字段检查

```python
def validate_message(msg: Dict) -> bool:
    """
    验证消息数据完整性
    """
    required_fields = ['id', 'from_uid', 'to_uids', 'content', 'timestamp']
    
    for field in required_fields:
        if field not in msg or msg[field] is None:
            return False
    
    # to_uids不能为空
    if not msg['to_uids']:
        return False
    
    return True
```

---

## 七、实施优先级

### Phase 1: BaseAdapter接口（1天）

**实现内容**:
- BaseAdapter抽象类
- 标准化数据结构

**产出**: 适配器接口

---

### Phase 2: DMWork参考实现（2天）

**实现内容**:
- DMWorkAdapter类
- 数据库查询逻辑
- to_uids推断

**产出**: 可用的DMWork适配器

---

### Phase 3: 文档和示例（1天）

**实现内容**:
- 适配器使用文档
- Slack适配器示例
- 单元测试

**产出**: 完整的Layer 1

---

## 八、下一步

**Layer 1数据适配器设计完成。**

**至此，OCTO-ONA全部6层设计完成！**

**接下来可以**:
1. 总结整体设计文档（生成README）
2. 开始实施（编码）
3. 或其他？

---

**变更记录**:
- 2026-03-19: v1.0初始版本，定义BaseAdapter接口、DMWork参考实现、to_uids推断规则
