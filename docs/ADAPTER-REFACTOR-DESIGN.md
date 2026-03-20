# BaseAdapter 重构设计

## 问题分析

### 当前问题

**BaseAdapter设计假设：**
```typescript
abstract class BaseAdapter {
  abstract connect(config: AdapterConfig): Promise<void>;
  abstract extractNetwork(options: ExtractionOptions): Promise<NetworkGraph>;
  abstract disconnect(): Promise<void>;
  
  // 这些方法假设了数据库式的数据源
  abstract fetchUsers(startTime?: Date, endTime?: Date): Promise<SourceUser[]>;
  abstract fetchMessages(startTime?: Date, endTime?: Date): Promise<SourceMessage[]>;
  abstract buildEdges(messages: SourceMessage[]): Edge[];
}
```

**问题：**
1. `fetchUsers/fetchMessages`假设了**数据库式**数据源（时间范围查询）
2. Discord/GitHub/Slack等**API式**数据源不适用这种模式：
   - Discord: 按频道分页拉取消息，每条消息自带作者信息
   - GitHub: GraphQL查询Issues/PRs，嵌套获取评论
   - Slack: conversations.history返回消息+用户混合数据
3. `buildEdges(messages)`参数不够灵活（缺少users参数）

---

## 解决方案

### 方案1：最小接口设计（推荐）✅

**核心思想：** BaseAdapter只定义必需的3个方法，其他由子类自由实现

```typescript
/**
 * BaseAdapter v2.0
 * 
 * 最小化抽象接口，支持任意数据源类型。
 */
export abstract class BaseAdapter {
  /**
   * 连接到数据源
   */
  abstract connect(config: AdapterConfig): Promise<void>;
  
  /**
   * 提取网络图（核心方法）
   */
  abstract extractNetwork(options: any): Promise<NetworkGraph>;
  
  /**
   * 断开连接
   */
  abstract disconnect(): Promise<void>;
}
```

**优点：**
- ✅ 简单、灵活
- ✅ 不限制子类实现细节
- ✅ 支持任意数据源（数据库/API/文件）
- ✅ 向后兼容（DMWorkAdapter无需改动）

**缺点：**
- ❌ 缺少代码复用（每个adapter自己实现extractNetwork）
- ❌ 没有规范化的中间方法

---

### 方案2：双层继承设计

**核心思想：** BaseAdapter作为最小接口，DatabaseAdapter/APIAdapter继承它

```typescript
// 最小基类
export abstract class BaseAdapter {
  abstract connect(config: any): Promise<void>;
  abstract extractNetwork(options: any): Promise<NetworkGraph>;
  abstract disconnect(): Promise<void>;
}

// 数据库式适配器（针对DMWork/MySQL/PostgreSQL）
export abstract class DatabaseAdapter extends BaseAdapter {
  abstract fetchUsers(startTime?: Date, endTime?: Date): Promise<SourceUser[]>;
  abstract fetchMessages(startTime?: Date, endTime?: Date): Promise<SourceMessage[]>;
  
  async extractNetwork(options: ExtractionOptions): Promise<NetworkGraph> {
    // 共享实现
    const users = await this.fetchUsers(options.startTime, options.endTime);
    const messages = await this.fetchMessages(options.startTime, options.endTime);
    return this.buildNetworkGraph(users, messages);
  }
}

// API式适配器（针对Discord/Slack/GitHub）
export abstract class APIAdapter extends BaseAdapter {
  abstract fetchData(options: any): Promise<any>;
  
  async extractNetwork(options: any): Promise<NetworkGraph> {
    const data = await this.fetchData(options);
    return this.transformToNetworkGraph(data);
  }
}
```

**子类示例：**
```typescript
class DMWorkAdapter extends DatabaseAdapter { ... }
class DiscordAdapter extends APIAdapter { ... }
class GitHubAdapter extends APIAdapter { ... }
```

**优点：**
- ✅ 清晰的层次结构
- ✅ 代码复用（DatabaseAdapter共享逻辑）
- ✅ 类型明确（数据库vs API）

**缺点：**
- ❌ 增加复杂度
- ❌ API适配器之间差异大（Discord ≠ GitHub）

---

### 方案3：组合模式（工具类）

**核心思想：** BaseAdapter最小化，提供工具类辅助实现

```typescript
// 最小基类
export abstract class BaseAdapter {
  abstract connect(config: any): Promise<void>;
  abstract extractNetwork(options: any): Promise<NetworkGraph>;
  abstract disconnect(): Promise<void>;
}

// 工具类（不继承，组合使用）
export class NetworkGraphBuilder {
  static buildFromUsers(users: any[], messages: any[]): NetworkGraph { ... }
  static buildEdges(messages: any[], humanIds: Set<string>, botIds: Set<string>): Edge[] { ... }
  static extractUsers(data: any[]): { humans: HumanNode[]; bots: AIAgentNode[] } { ... }
}

// 使用示例
class DiscordAdapter extends BaseAdapter {
  async extractNetwork(options: any): Promise<NetworkGraph> {
    const messages = await this.fetchMessages(options);
    const { humans, bots } = NetworkGraphBuilder.extractUsers(messages);
    const edges = NetworkGraphBuilder.buildEdges(messages, humanIds, botIds);
    return NetworkGraphBuilder.buildFromUsers(humans, bots, edges, messages);
  }
}
```

**优点：**
- ✅ 代码复用（工具函数共享）
- ✅ 灵活（不强制继承结构）
- ✅ 易测试（工具函数独立测试）

**缺点：**
- ❌ 缺少统一规范

---

## 推荐方案

### **方案1 + 方案3 组合** ✅

**设计：**
1. BaseAdapter采用**最小接口**（3个方法）
2. 提供**NetworkGraphBuilder工具类**辅助构建
3. 每个adapter自由选择是否使用工具类

**代码示例：**

```typescript
// src/layer1/base-adapter.ts
export abstract class BaseAdapter {
  abstract connect(config: any): Promise<void>;
  abstract extractNetwork(options: any): Promise<NetworkGraph>;
  abstract disconnect(): Promise<void>;
}

// src/layer1/network-graph-builder.ts
export class NetworkGraphBuilder {
  /**
   * 从用户列表中分离人类和Bot
   */
  static separateUsers(
    users: Array<{ id: string; name: string; is_bot: boolean }>
  ): { humans: HumanNode[]; bots: AIAgentNode[] } {
    const humans: HumanNode[] = [];
    const bots: AIAgentNode[] = [];
    
    for (const user of users) {
      if (user.is_bot) {
        bots.push({
          id: user.id,
          bot_name: user.name,
          type: 'ai_agent',
          capabilities: [],
          functional_tags: [],
        });
      } else {
        humans.push({
          id: user.id,
          name: user.name,
          type: 'human',
        });
      }
    }
    
    return { humans, bots };
  }
  
  /**
   * 从消息构建边
   */
  static buildEdges(
    messages: Array<{ from: string; to: string[] }>,
    humanIds: Set<string>,
    botIds: Set<string>
  ): Edge[] {
    const edgeMap = new Map<string, Edge>();
    
    for (const msg of messages) {
      for (const target of msg.to) {
        if (msg.from === target) continue;
        
        const key = `${msg.from}-${target}`;
        if (!edgeMap.has(key)) {
          const sourceIsHuman = humanIds.has(msg.from);
          const targetIsHuman = humanIds.has(target);
          
          let edgeType: 'H2H' | 'H2B' | 'B2H' | 'B2B';
          if (sourceIsHuman && targetIsHuman) edgeType = 'H2H';
          else if (sourceIsHuman && !targetIsHuman) edgeType = 'H2B';
          else if (!sourceIsHuman && targetIsHuman) edgeType = 'B2H';
          else edgeType = 'B2B';
          
          edgeMap.set(key, {
            source: msg.from,
            target,
            edge_type: edgeType,
            weight: 0,
            is_cross_team: false,
            message_ids: [],
          });
        }
        
        const edge = edgeMap.get(key)!;
        edge.weight++;
      }
    }
    
    return Array.from(edgeMap.values());
  }
  
  /**
   * 构建完整NetworkGraph
   */
  static build(params: {
    graphId: string;
    description: string;
    startTime: Date;
    endTime: Date;
    humans: HumanNode[];
    bots: AIAgentNode[];
    edges: Edge[];
    messages: Message[];
  }): NetworkGraph {
    return {
      graph_id: params.graphId,
      description: params.description,
      start_time: params.startTime,
      end_time: params.endTime,
      human_nodes: params.humans,
      ai_agent_nodes: params.bots,
      edges: params.edges,
      messages: params.messages,
      summary: {
        total_nodes: params.humans.length + params.bots.length,
        total_humans: params.humans.length,
        total_bots: params.bots.length,
        total_edges: params.edges.length,
        total_messages: params.messages.length,
      },
      created_at: new Date(),
      version: '2.0',
    };
  }
}
```

**DiscordAdapter使用示例：**
```typescript
import { BaseAdapter } from '../base-adapter';
import { NetworkGraphBuilder } from '../network-graph-builder';

export class DiscordAdapter extends BaseAdapter {
  async extractNetwork(options: any): Promise<NetworkGraph> {
    // 1. 获取数据（Discord API）
    const messages = await this.fetchDiscordMessages(options);
    
    // 2. 使用工具类分离用户
    const allUsers = this.extractUsersFromMessages(messages);
    const { humans, bots } = NetworkGraphBuilder.separateUsers(allUsers);
    
    // 3. 使用工具类构建边
    const humanIds = new Set(humans.map(h => h.id));
    const botIds = new Set(bots.map(b => b.id));
    const edges = NetworkGraphBuilder.buildEdges(
      messages.map(m => ({ from: m.author.id, to: m.mentions.map(u => u.id) })),
      humanIds,
      botIds
    );
    
    // 4. 使用工具类构建NetworkGraph
    return NetworkGraphBuilder.build({
      graphId: `discord_${Date.now()}`,
      description: 'Discord network',
      startTime: options.startTime,
      endTime: options.endTime,
      humans,
      bots,
      edges,
      messages: this.transformMessages(messages),
    });
  }
}
```

---

## 迁移计划

### Phase 1: 重构BaseAdapter（1小时）

1. ✅ 创建`NetworkGraphBuilder`工具类
2. ✅ 简化`BaseAdapter`（删除fetchUsers/fetchMessages/buildEdges）
3. ✅ 更新`DMWorkAdapter`使用工具类（可选）
4. ✅ 更新测试

### Phase 2: 实现DiscordAdapter（2小时）

1. ✅ 使用新BaseAdapter
2. ✅ 使用NetworkGraphBuilder工具类
3. ✅ 编写测试
4. ✅ 文档示例

### Phase 3: 实现GitHubAdapter（2小时）

1. ✅ 使用新BaseAdapter
2. ✅ 使用NetworkGraphBuilder工具类
3. ✅ 编写测试
4. ✅ 文档示例

---

## API对比

### 旧BaseAdapter（v1.0）

```typescript
abstract class BaseAdapter {
  abstract connect(config: AdapterConfig): Promise<void>;
  abstract extractNetwork(options: ExtractionOptions): Promise<NetworkGraph>;
  abstract disconnect(): Promise<void>;
  
  // 这些方法限制了适配器类型
  abstract fetchUsers(startTime?: Date, endTime?: Date): Promise<SourceUser[]>;
  abstract fetchMessages(startTime?: Date, endTime?: Date): Promise<SourceMessage[]>;
  abstract buildEdges(messages: SourceMessage[]): Edge[];
}
```

### 新BaseAdapter（v1.1）

```typescript
abstract class BaseAdapter {
  // 只保留必需的3个方法
  abstract connect(config: any): Promise<void>;
  abstract extractNetwork(options: any): Promise<NetworkGraph>;
  abstract disconnect(): Promise<void>;
}

// 工具类辅助（可选使用）
class NetworkGraphBuilder {
  static separateUsers(...): { humans, bots };
  static buildEdges(...): Edge[];
  static build(...): NetworkGraph;
}
```

---

## 向后兼容性

**DMWorkAdapter兼容性：**
- ✅ 无需修改（仍可继承BaseAdapter）
- ✅ 可选迁移到工具类（提高代码复用）

**用户代码兼容性：**
- ✅ 接口未变（connect/extractNetwork/disconnect）
- ✅ 现有用户代码无影响

---

## 总结

**推荐方案：** 方案1（最小接口）+ 方案3（工具类）

**优势：**
1. ✅ 简单灵活（BaseAdapter只3个方法）
2. ✅ 代码复用（NetworkGraphBuilder工具类）
3. ✅ 支持任意数据源（数据库/API/文件）
4. ✅ 向后兼容（现有代码无影响）
5. ✅ 易扩展（新适配器自由选择是否用工具类）

**下一步：**
1. 实现NetworkGraphBuilder工具类
2. 重构BaseAdapter（删除abstract方法）
3. 更新DiscordAdapter/GitHubAdapter使用新设计
4. 编写测试和文档

---

**文档创建时间：** 2026-03-20 12:33  
**作者：** Mayo  
**版本：** v1.0
