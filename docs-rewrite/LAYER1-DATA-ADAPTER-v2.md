# OCTO-ONA Layer 1 数据适配器设计 v2.0

**更新时间**: 2026-03-19  
**版本**: v2.0 (TypeScript)  
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

```typescript
import mysql from 'mysql2/promise';
import { z } from 'zod';
import { NetworkGraph, HumanNode, AIAgentNode, Message, Edge } from '../layer2';

// Zod schemas for validation
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  is_bot: z.boolean(),
  role: z.string().optional(),
  team: z.string().optional(),
  creator_uid: z.string().optional(),
  email: z.string().optional(),
});

const MessageSchema = z.object({
  id: z.string(),
  from_uid: z.string(),
  to_uids: z.array(z.string()),
  content: z.string(),
  timestamp: z.date(),
  reply_to: z.string().optional(),
  context_id: z.string().optional(),
});

type User = z.infer<typeof UserSchema>;
type MessageData = z.infer<typeof MessageSchema>;

interface AdapterConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  platform?: string;
  [key: string]: unknown;
}

abstract class BaseAdapter {
  /**
   * 数据适配器基类
   * 
   * 用户需要实现4个核心方法：
   * 1. fetchUsers() — 获取用户列表
   * 2. fetchMessages() — 获取消息列表
   * 3. buildNodes() — 构建节点
   * 4. buildEdges() — 构建边
   */
  
  protected config: AdapterConfig;
  
  constructor(config: AdapterConfig) {
    /**
     * 初始化适配器
     * 
     * @param config - 配置对象（连接信息、过滤条件等）
     */
    this.config = config;
  }
  
  abstract fetchUsers(): Promise<User[]>;
  /**
   * 获取用户列表
   * 
   * @returns Promise<User[]>
   * [
   *   {
   *     id: 'user_uid',
   *     name: '张三',
   *     is_bot: false,
   *     role: 'PM',
   *     team: '产品',
   *     ...
   *   },
   *   ...
   * ]
   */
  
  abstract fetchMessages(
    startTime?: Date,
    endTime?: Date
  ): Promise<MessageData[]>;
  /**
   * 获取消息列表
   * 
   * @param startTime - 起始时间
   * @param endTime - 结束时间
   * @returns Promise<MessageData[]>
   * [
   *   {
   *     id: 'msg_id',
   *     from_uid: 'user1',
   *     to_uids: ['user2', 'user3'],  // 接收者列表
   *     content: '消息内容',
   *     timestamp: new Date(...),
   *     reply_to: 'msg_xxx',  // 可选
   *     context_id: 'channel_id',  // 可选
   *     ...
   *   },
   *   ...
   * ]
   */
  
  buildNodes(users: User[]): { humanNodes: HumanNode[]; aiAgentNodes: AIAgentNode[] } {
    /**
     * 构建节点列表
     * 
     * @param users - fetchUsers()返回的用户列表
     * @returns { humanNodes, aiAgentNodes }
     */
    const humanNodes: HumanNode[] = [];
    const aiAgentNodes: AIAgentNode[] = [];
    
    for (const user of users) {
      if (user.is_bot) {
        aiAgentNodes.push(new AIAgentNode({
          id: user.id,
          botName: user.name,
          creatorUid: user.creator_uid,
        }));
      } else {
        humanNodes.push(new HumanNode({
          id: user.id,
          name: user.name,
          role: user.role,
          team: user.team,
        }));
      }
    }
    
    return { humanNodes, aiAgentNodes };
  }
  
  buildEdges(messages: MessageData[]): Edge[] {
    /**
     * 从消息构建边
     * 
     * @param messages - fetchMessages()返回的消息列表
     * @returns Edge[]
     */
    const edgeMap = new Map<string, number>();  // {`${source}:${target}`: weight}
    
    for (const msg of messages) {
      const source = msg.from_uid;
      const targets = msg.to_uids;
      
      for (const target of targets) {
        const key = `${source}:${target}`;
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
      }
    }
    
    // 构建Edge对象
    const edges: Edge[] = [];
    for (const [key, weight] of edgeMap.entries()) {
      const [source, target] = key.split(':');
      edges.push(new Edge({
        source,
        target,
        edgeType: this._inferEdgeType(source, target),
        weight,
      }));
    }
    
    return edges;
  }
  
  protected _inferEdgeType(source: string, target: string): string {
    /**
     * 推断边类型（H2H/H2B/B2H/B2B）
     * 
     * 需要子类覆盖或提供节点类型信息
     */
    // 默认实现：需要子类提供节点类型映射
    return "unknown";
  }
  
  protected _filterByUidWhitelist(messages: MessageData[], uidWhitelist: string[]): MessageData[] {
    /**
     * 按用户白名单过滤消息
     * 
     * 过滤规则：保留满足以下任一条件的消息
     * 1. from_uid在白名单中
     * 2. to_uids中至少有一个在白名单中
     * 
     * @param messages - 消息列表
     * @param uidWhitelist - 用户UID白名单
     * @returns 过滤后的消息列表
     */
    const filtered: MessageData[] = [];
    const uidSet = new Set(uidWhitelist);
    
    for (const msg of messages) {
      // 条件1: 发送者在白名单
      if (uidSet.has(msg.from_uid)) {
        filtered.push(msg);
        continue;
      }
      
      // 条件2: 至少一个接收者在白名单
      if (msg.to_uids.some(uid => uidSet.has(uid))) {
        filtered.push(msg);
      }
    }
    
    return filtered;
  }
  
  protected _filterByChannels(messages: MessageData[], channelIds: string[]): MessageData[] {
    /**
     * 按频道ID过滤消息
     * 
     * @param messages - 消息列表
     * @param channelIds - 频道ID列表
     * @returns 过滤后的消息列表
     */
    const channelSet = new Set(channelIds);
    return messages.filter(msg => 
      msg.context_id && channelSet.has(msg.context_id)
    );
  }
  
  async toNetworkGraph(options: {
    startTime?: Date;
    endTime?: Date;
    graphId?: string;
    uidWhitelist?: string[];
    channelIds?: string[];
  } = {}): Promise<NetworkGraph> {
    /**
     * 完整数据转换流程
     * 
     * @param options.startTime - 起始时间
     * @param options.endTime - 结束时间
     * @param options.graphId - 图ID
     * @param options.uidWhitelist - 用户白名单（只提取这些人相关的消息）
     *                               相关 = from_uid在列表 OR to_uids包含列表中的人
     * @param options.channelIds - 频道ID列表（只提取这些频道的消息）
     * @returns Promise<NetworkGraph>
     */
    const { startTime, endTime, graphId, uidWhitelist, channelIds } = options;
    
    // 1. 获取原始数据
    const users = await this.fetchUsers();
    let messages = await this.fetchMessages(startTime, endTime);
    
    // 2. 应用过滤
    if (uidWhitelist && uidWhitelist.length > 0) {
      messages = this._filterByUidWhitelist(messages, uidWhitelist);
    }
    
    if (channelIds && channelIds.length > 0) {
      messages = this._filterByChannels(messages, channelIds);
    }
    
    // 3. 构建节点
    const { humanNodes, aiAgentNodes } = this.buildNodes(users);
    
    // 4. 构建消息对象
    const messageObjects = messages.map(msg => new Message({
      id: msg.id,
      fromUid: msg.from_uid,
      toUids: msg.to_uids,
      content: msg.content,
      timestamp: msg.timestamp,
      replyTo: msg.reply_to,
      platform: this.config.platform,
      contextId: msg.context_id,
    }));
    
    // 5. 构建边
    const edges = this.buildEdges(messages);
    
    // 6. 构建NetworkGraph
    return new NetworkGraph({
      graphId: graphId || `${this.config.platform}_${startTime}_${endTime}`,
      description: `Network from ${startTime} to ${endTime}`,
      startTime: startTime || new Date(0),
      endTime: endTime || new Date(),
      humanNodes,
      aiAgentNodes,
      edges,
      messages: messageObjects,
      platformSources: [this.config.platform || 'unknown'],
    });
  }
}

export { BaseAdapter, AdapterConfig, User, MessageData, UserSchema, MessageSchema };
```

---

## 三、DMWork参考实现

### 3.1 DMWorkAdapter

```typescript
import mysql from 'mysql2/promise';
import { BaseAdapter, AdapterConfig, User, MessageData } from './BaseAdapter';

class DMWorkAdapter extends BaseAdapter {
  /**
   * DMWork数据适配器（参考实现）
   */
  
  private pool: mysql.Pool;
  
  constructor(config: AdapterConfig) {
    /**
     * 初始化DMWork适配器
     * 
     * @param config - {
     *   host: 'im-test.xming.ai',
     *   port: 13306,
     *   user: 'dmwork_ro',
     *   password: '...',
     *   database: 'im',
     *   platform: 'dmwork'
     * }
     */
    super(config);
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  
  async fetchUsers(): Promise<User[]> {
    /**
     * 从user表获取用户
     */
    // 查询用户
    const [userRows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT uid AS id, name, robot AS is_bot, email FROM user`
    );
    
    // 查询Bot的创建者
    const [robotRows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT uid AS id, creator_uid FROM robot`
    );
    
    const robotCreators = new Map<string, string>();
    for (const robot of robotRows) {
      robotCreators.set(robot.id, robot.creator_uid);
    }
    
    // 合并数据
    const users: User[] = userRows.map(user => ({
      id: user.id,
      name: user.name,
      is_bot: Boolean(user.is_bot),
      email: user.email,
      creator_uid: Boolean(user.is_bot) ? robotCreators.get(user.id) : undefined,
    }));
    
    return users;
  }
  
  async fetchMessages(startTime?: Date, endTime?: Date): Promise<MessageData[]> {
    /**
     * 从5张message表获取消息
     */
    // DMWork有5张消息表：message, message1, message2, message3, message4
    const tables = ['message', 'message1', 'message2', 'message3', 'message4'];
    
    const allMessages: MessageData[] = [];
    
    for (const table of tables) {
      // 构建查询
      let query = `
        SELECT 
          message_id AS id,
          from_uid,
          channel_id AS context_id,
          content,
          created_at AS timestamp
        FROM ${table}
        WHERE 1=1
      `;
      
      const params: any[] = [];
      if (startTime) {
        query += " AND created_at >= ?";
        params.push(startTime);
      }
      if (endTime) {
        query += " AND created_at <= ?";
        params.push(endTime);
      }
      
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(query, params);
      
      // 构建MessageData对象
      for (const row of rows) {
        const toUids = await this._inferRecipients(row);
        allMessages.push({
          id: row.id,
          from_uid: row.from_uid,
          context_id: row.context_id,
          content: row.content,
          timestamp: new Date(row.timestamp),
          to_uids: toUids,
        });
      }
    }
    
    return allMessages;
  }
  
  private async _inferRecipients(msg: mysql.RowDataPacket): Promise<string[]> {
    /**
     * 推断消息接收者
     * 
     * 简化实现：返回channel的所有成员（排除发送者）
     */
    if (!msg.context_id) {
      return [];  // 无法推断
    }
    
    const [members] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT uid FROM group_member WHERE group_no = ? AND uid != ?`,
      [msg.context_id, msg.from_uid]
    );
    
    return members.map(m => m.uid);
  }
  
  async close(): Promise<void> {
    /**
     * 关闭数据库连接池
     */
    await this.pool.end();
  }
}

export { DMWorkAdapter };
```

---

## 四、使用示例

### 4.1 DMWork数据提取

```typescript
// 配置
const config = {
  host: 'im-test.xming.ai',
  port: 13306,
  user: 'dmwork_ro',
  password: 'your_password',
  database: 'im',
  platform: 'dmwork'
};

// 创建适配器
const adapter = new DMWorkAdapter(config);

// 提取数据
const networkGraph = await adapter.toNetworkGraph({
  startTime: new Date('2026-03-01'),
  endTime: new Date('2026-03-18'),
  graphId: 'octo_2026_03'
});

// 保存
import fs from 'fs/promises';
await fs.writeFile('network.json', JSON.stringify(networkGraph, null, 2));

// 关闭连接
await adapter.close();
```

---

### 4.2 主题过滤（推荐）

**场景**: 只分析"OCTO产品研发"主题的网络

#### **方法1: 用户白名单过滤**

```typescript
import fs from 'fs/promises';

// 1. 加载OCTO团队UID映射
const octoTeamData = await fs.readFile('octo-team-uid-mapping-final.json', 'utf-8');
const octoTeam = JSON.parse(octoTeamData);
const octoUids = octoTeam.members.map((member: any) => member.uid);

// 2. 提取OCTO子网络
const octoGraph = await adapter.toNetworkGraph({
  startTime: new Date('2026-03-01'),
  endTime: new Date('2026-03-18'),
  uidWhitelist: octoUids,  // 只提取核心团队相关的消息
  graphId: 'octo_2026_03'
});

// 过滤规则：
// - 保留 from_uid 在 octoUids 中的消息
// - 保留 to_uids 包含 octoUids 中任一成员的消息
```

**适用场景**:
- 团队网络分析（已知核心成员）
- 项目子网络提取
- 去除噪音数据

---

#### **方法2: 频道过滤**

```typescript
// 场景：只分析特定频道
const octoChannels = [
  'octo_dev_channel',
  'octo_product_channel',
  'octo_design_channel'
];

const octoGraph = await adapter.toNetworkGraph({
  startTime: new Date('2026-03-01'),
  endTime: new Date('2026-03-18'),
  channelIds: octoChannels,
  graphId: 'octo_channels_2026_03'
});
```

**适用场景**:
- 按项目频道分析
- 去除测试/闲聊频道

---

#### **方法3: 组合过滤**

```typescript
// 同时使用多种过滤条件
const octoGraph = await adapter.toNetworkGraph({
  startTime: new Date('2026-03-01'),
  endTime: new Date('2026-03-18'),
  uidWhitelist: octoUids,      // 核心团队
  channelIds: octoChannels,     // 项目频道
  graphId: 'octo_strict_2026_03'
});

// 效果：只保留"核心团队成员在项目频道中的消息"
```

---

#### **对比：全量 vs 过滤**

```typescript
// 全量数据（所有消息）
const fullGraph = await adapter.toNetworkGraph({
  startTime: new Date('2026-03-01'),
  endTime: new Date('2026-03-18')
});
// 结果：51节点，267,706条消息

// OCTO过滤（核心团队）
const octoGraph = await adapter.toNetworkGraph({
  startTime: new Date('2026-03-01'),
  endTime: new Date('2026-03-18'),
  uidWhitelist: octoUids
});
// 结果：15节点，33,770条消息（12.6%）

// 性能提升：
// - 数据量减少 87.4%
// - 分析时间缩短 ~90%
// - 聚焦核心协作网络
```

---

### 4.3 自定义适配器（Slack示例）

```typescript
import { WebClient } from '@slack/web-api';
import { BaseAdapter, AdapterConfig, User, MessageData } from './BaseAdapter';

class SlackAdapter extends BaseAdapter {
  /**
   * Slack数据适配器（用户自定义）
   */
  
  private client: WebClient;
  
  constructor(config: AdapterConfig) {
    super(config);
    // 初始化Slack API客户端
    this.client = new WebClient(config.token as string);
  }
  
  async fetchUsers(): Promise<User[]> {
    /**
     * 从Slack API获取用户
     */
    const response = await this.client.users.list();
    const users: User[] = [];
    
    if (response.members) {
      for (const member of response.members) {
        users.push({
          id: member.id!,
          name: member.real_name || member.name!,
          is_bot: member.is_bot || false
        });
      }
    }
    
    return users;
  }
  
  async fetchMessages(startTime?: Date, endTime?: Date): Promise<MessageData[]> {
    /**
     * 从Slack API获取消息
     */
    // 获取频道列表
    const channelsResponse = await this.client.conversations.list();
    const channels = channelsResponse.channels || [];
    
    const messages: MessageData[] = [];
    for (const channel of channels) {
      // 获取消息
      const history = await this.client.conversations.history({
        channel: channel.id!,
        oldest: startTime ? String(startTime.getTime() / 1000) : undefined,
        latest: endTime ? String(endTime.getTime() / 1000) : undefined
      });
      
      if (history.messages) {
        for (const msg of history.messages) {
          if (msg.user && msg.text && msg.ts) {
            const toUids = await this._getChannelMembers(channel.id!);
            messages.push({
              id: msg.ts,
              from_uid: msg.user,
              to_uids: toUids,
              content: msg.text,
              timestamp: new Date(parseFloat(msg.ts) * 1000),
              context_id: channel.id
            });
          }
        }
      }
    }
    
    return messages;
  }
  
  private async _getChannelMembers(channelId: string): Promise<string[]> {
    /**获取频道成员*/
    const response = await this.client.conversations.members({ channel: channelId });
    return response.members || [];
  }
}

export { SlackAdapter };
```

---

## 五、to_uids构建规则（重要）

### 5.1 推断逻辑

**场景1: 群聊消息**
```typescript
// DMWork/Slack群聊
const toUids = channelMembers.filter(uid => uid !== fromUid);
```

**场景2: @提及**
```typescript
// 如果消息有@提及
const toUids = mentionedUsers;
```

**场景3: 回复消息**
```typescript
// 如果是回复
const originalMsg = await getMessage(replyTo);
const toUids = [originalMsg.from_uid];
```

**场景4: 单聊**
```typescript
// 单聊消息
const toUids = [receiverUid];
```

### 5.2 优先级

```typescript
async function inferRecipients(
  msg: MessageData, 
  channelMembers: Map<string, string[]>
): Promise<string[]> {
  /**
   * 推断接收者（优先级）
   * 
   * 1. mentions（@提及） — 最高优先级
   * 2. reply_to（回复） — 次优先级
   * 3. channel_members（群聊） — 默认
   */
  
  // 1. 如果有@提及
  if (msg.mentions && msg.mentions.length > 0) {
    return msg.mentions;
  }
  
  // 2. 如果是回复
  if (msg.reply_to) {
    const original = await getMessage(msg.reply_to);
    return [original.from_uid];
  }
  
  // 3. 群聊（所有成员）
  if (msg.context_id) {
    const members = channelMembers.get(msg.context_id) || [];
    return members.filter(m => m !== msg.from_uid);
  }
  
  // 4. 无法推断
  return [];
}
```

---

## 六、数据验证

### 6.1 必需字段检查

```typescript
import { z } from 'zod';

const MessageValidationSchema = z.object({
  id: z.string().min(1),
  from_uid: z.string().min(1),
  to_uids: z.array(z.string()).min(1),  // to_uids不能为空
  content: z.string(),
  timestamp: z.date()
});

function validateMessage(msg: unknown): boolean {
  /**
   * 验证消息数据完整性
   */
  try {
    MessageValidationSchema.parse(msg);
    return true;
  } catch (error) {
    console.error('Message validation failed:', error);
    return false;
  }
}

// 使用示例
const message = {
  id: 'msg_123',
  from_uid: 'user1',
  to_uids: ['user2', 'user3'],
  content: 'Hello',
  timestamp: new Date()
};

if (validateMessage(message)) {
  console.log('Message is valid');
}
```

---

## 七、实施优先级

### Phase 1: BaseAdapter接口（1天）

**实现内容**:
- BaseAdapter抽象类
- 标准化数据结构
- Zod schemas

**产出**: 适配器接口

---

### Phase 2: DMWork参考实现（2天）

**实现内容**:
- DMWorkAdapter类
- 数据库查询逻辑（mysql2）
- to_uids推断

**产出**: 可用的DMWork适配器

---

### Phase 3: 文档和示例（1天）

**实现内容**:
- 适配器使用文档
- Slack适配器示例
- 单元测试（Jest）

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
- 2026-03-19 v1.0: 初始版本（Python），定义BaseAdapter接口、DMWork参考实现、to_uids推断规则
- 2026-03-19 v1.1: 新增数据过滤功能（uid_whitelist + channel_ids），支持主题子网络提取
- 2026-03-19 v2.0: TypeScript版本，使用mysql2代替pymysql，使用zod代替Pydantic，所有方法改为async/await风格
