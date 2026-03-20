/**
 * OCTO-ONA Layer 1: Base Data Adapter
 * 
 * Abstract base class for data adapters.
 * Users can extend this to adapt custom data sources.
 */

import { z } from 'zod';
import {
  NetworkGraph,
  NetworkGraphSchema,
  HumanNode,
  AIAgentNode,
  Message,
  Edge,
} from '../layer2/models';

// ============================================
// Type Definitions
// ============================================

export const SourceUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  is_bot: z.boolean(),
  role: z.string().optional(),
  team: z.string().optional(),
  creator_uid: z.string().optional(),
  email: z.string().optional(),
  created_at: z.coerce.date().optional(),
});

export type SourceUser = z.infer<typeof SourceUserSchema>;

export const SourceMessageSchema = z.object({
  id: z.string(),
  from_uid: z.string(),
  to_uids: z.array(z.string()),
  content: z.string(),
  timestamp: z.coerce.date(),
  reply_to: z.string().optional(),
  context_id: z.string().optional(),
});

export type SourceMessage = z.infer<typeof SourceMessageSchema>;

export interface AdapterConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  platform?: string;
  [key: string]: unknown;
}

export interface FilterOptions {
  startTime?: Date;
  endTime?: Date;
  graphId?: string;
  uidWhitelist?: string[];
  channelIds?: string[];
}

// ============================================
// BaseAdapter Abstract Class
// ============================================

export abstract class BaseAdapter {
  protected config: AdapterConfig;
  protected nodeTypeMap: Map<string, 'human' | 'bot'> = new Map();
  
  constructor(config: AdapterConfig) {
    this.config = config;
  }
  
  // Abstract methods (must implement)
  abstract fetchUsers(): Promise<SourceUser[]>;
  abstract fetchMessages(startTime?: Date, endTime?: Date): Promise<SourceMessage[]>;
  
  // Data transformation methods
  buildNodes(users: SourceUser[]): {
    humanNodes: HumanNode[];
    aiAgentNodes: AIAgentNode[];
  } {
    const humanNodes: HumanNode[] = [];
    const aiAgentNodes: AIAgentNode[] = [];
    
    for (const user of users) {
      this.nodeTypeMap.set(user.id, user.is_bot ? 'bot' : 'human');
      
      if (user.is_bot) {
        aiAgentNodes.push({
          id: user.id,
          bot_name: user.name,
          creator_uid: user.creator_uid,
          capabilities: [],
          functional_tags: [],
          type: 'ai_agent',
          created_at: user.created_at,
        });
      } else {
        humanNodes.push({
          id: user.id,
          name: user.name,
          role: user.role,
          team: user.team,
          email: user.email,
          type: 'human',
          created_at: user.created_at,
        });
      }
    }
    
    return { humanNodes, aiAgentNodes };
  }
  
  /**
   * Build edges from messages by aggregating interactions
   * 
   * Creates edges between from_uid and each to_uid.
   * Aggregates multiple messages into single edge with weight.
   * Tracks first/last interaction timestamps.
   * 
   * @param messages - Message list from fetchMessages()
   * @returns Array of Edge objects with weights and timestamps
   */
  buildEdges(messages: SourceMessage[]): Edge[] {
    const edgeMap = new Map<string, {
      weight: number;
      messageIds: string[];
      firstInteraction?: Date;
      lastInteraction?: Date;
    }>();
    
    for (const msg of messages) {
      for (const target of msg.to_uids) {
        const key = `${msg.from_uid}:${target}`;
        const existing = edgeMap.get(key);
        
        if (existing) {
          existing.weight += 1;
          existing.messageIds.push(msg.id);
          if (msg.timestamp < existing.firstInteraction!) {
            existing.firstInteraction = msg.timestamp;
          }
          if (msg.timestamp > existing.lastInteraction!) {
            existing.lastInteraction = msg.timestamp;
          }
        } else {
          edgeMap.set(key, {
            weight: 1,
            messageIds: [msg.id],
            firstInteraction: msg.timestamp,
            lastInteraction: msg.timestamp,
          });
        }
      }
    }
    
    const edges: Edge[] = [];
    for (const [key, data] of edgeMap.entries()) {
      const [source, target] = key.split(':');
      
      edges.push({
        source,
        target,
        edge_type: this._inferEdgeType(source, target),
        weight: data.weight,
        is_cross_team: false,
        message_ids: data.messageIds,
        first_interaction: data.firstInteraction,
        last_interaction: data.lastInteraction,
      });
    }
    
    return edges;
  }
  
  // Filtering methods
  protected _filterByUidWhitelist(
    messages: SourceMessage[],
    uidWhitelist: string[]
  ): SourceMessage[] {
    const uidSet = new Set(uidWhitelist);
    const filtered: SourceMessage[] = [];
    
    for (const msg of messages) {
      if (uidSet.has(msg.from_uid)) {
        filtered.push(msg);
        continue;
      }
      
      if (msg.to_uids.some(uid => uidSet.has(uid))) {
        filtered.push(msg);
      }
    }
    
    return filtered;
  }
  
  protected _filterByChannels(
    messages: SourceMessage[],
    channelIds: string[]
  ): SourceMessage[] {
    const channelSet = new Set(channelIds);
    return messages.filter(msg =>
      msg.context_id && channelSet.has(msg.context_id)
    );
  }
  
  protected _inferEdgeType(
    source: string,
    target: string
  ): 'H2H' | 'H2B' | 'B2H' | 'B2B' {
    const sourceType = this.nodeTypeMap.get(source) || 'human';
    const targetType = this.nodeTypeMap.get(target) || 'human';
    
    if (sourceType === 'human' && targetType === 'human') return 'H2H';
    if (sourceType === 'human' && targetType === 'bot') return 'H2B';
    if (sourceType === 'bot' && targetType === 'human') return 'B2H';
    return 'B2B';
  }
  
  async toNetworkGraph(options: FilterOptions = {}): Promise<NetworkGraph> {
    const {
      startTime,
      endTime,
      graphId,
      uidWhitelist,
      channelIds,
    } = options;
    
    console.log('Fetching users...');
    const users = await this.fetchUsers();
    console.log(`Fetched ${users.length} users`);
    
    console.log('Fetching messages...');
    let messages = await this.fetchMessages(startTime, endTime);
    console.log(`Fetched ${messages.length} messages`);
    
    if (uidWhitelist && uidWhitelist.length > 0) {
      const before = messages.length;
      messages = this._filterByUidWhitelist(messages, uidWhitelist);
      console.log(`UID filter: ${before} → ${messages.length}`);
    }
    
    if (channelIds && channelIds.length > 0) {
      const before = messages.length;
      messages = this._filterByChannels(messages, channelIds);
      console.log(`Channel filter: ${before} → ${messages.length}`);
    }
    
    const { humanNodes, aiAgentNodes } = this.buildNodes(users);
    console.log(`Built ${humanNodes.length} humans, ${aiAgentNodes.length} bots`);
    
    const messageObjects: Message[] = messages.map(msg => ({
      id: msg.id,
      from_uid: msg.from_uid,
      to_uids: msg.to_uids,
      content: msg.content,
      timestamp: msg.timestamp,
      reply_to: msg.reply_to,
      platform: this.config.platform,
      context_id: msg.context_id,
    }));
    
    const edges = this.buildEdges(messages);
    console.log(`Built ${edges.length} edges`);
    
    const graph: NetworkGraph = {
      graph_id: graphId || `${this.config.platform || 'unknown'}_${Date.now()}`,
      description: `Network from ${this.config.platform || 'unknown'}`,
      start_time: startTime || new Date(0),
      end_time: endTime || new Date(),
      human_nodes: humanNodes,
      ai_agent_nodes: aiAgentNodes,
      edges,
      messages: messageObjects,
      summary: {
        total_nodes: humanNodes.length + aiAgentNodes.length,
        total_humans: humanNodes.length,
        total_bots: aiAgentNodes.length,
        total_edges: edges.length,
        total_messages: messages.length,
      },
      created_at: new Date(),
      version: '2.0',
    };
    
    return NetworkGraphSchema.parse(graph);
  }
}
