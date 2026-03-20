/**
 * NetworkGraphBuilder - Utility for constructing NetworkGraph
 * 
 * Provides reusable functions to build NetworkGraph from raw data.
 * Can be used by any adapter (DMWork, Discord, GitHub, etc.)
 */

import {
  NetworkGraph,
  HumanNode,
  AIAgentNode,
  Edge,
  Message,
} from '../layer2/models';

/**
 * NetworkGraphBuilder
 * 
 * Static utility class for building NetworkGraph objects.
 */
export class NetworkGraphBuilder {
  /**
   * Separate users into humans and bots
   * 
   * @param users - Array of users with id, name, and is_bot flag
   * @returns Object with humans and bots arrays
   * 
   * @example
   * ```typescript
   * const users = [
   *   { id: '1', name: 'Alice', is_bot: false },
   *   { id: '2', name: 'Bot', is_bot: true },
   * ];
   * 
   * const { humans, bots } = NetworkGraphBuilder.separateUsers(users);
   * // humans: [{ id: '1', name: 'Alice', type: 'human' }]
   * // bots: [{ id: '2', bot_name: 'Bot', type: 'ai_agent', ... }]
   * ```
   */
  static separateUsers(
    users: Array<{
      id: string;
      name: string;
      is_bot: boolean;
      team?: string;
      role?: string;
      email?: string;
      creator_uid?: string;
    }>
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
          creator_uid: user.creator_uid,
        });
      } else {
        humans.push({
          id: user.id,
          name: user.name,
          type: 'human',
          team: user.team,
          role: user.role,
          email: user.email,
        });
      }
    }
    
    return { humans, bots };
  }
  
  /**
   * Build edges from messages
   * 
   * @param messages - Array of messages with from and to fields
   * @param humanIds - Set of human user IDs
   * @param botIds - Set of bot user IDs
   * @returns Array of Edge objects
   * 
   * @example
   * ```typescript
   * const messages = [
   *   { id: 'm1', from: 'u1', to: ['u2'], timestamp: new Date() },
   *   { id: 'm2', from: 'u1', to: ['u2'], timestamp: new Date() },
   * ];
   * 
   * const humanIds = new Set(['u1', 'u2']);
   * const botIds = new Set(['b1']);
   * 
   * const edges = NetworkGraphBuilder.buildEdges(messages, humanIds, botIds);
   * // [{ source: 'u1', target: 'u2', edge_type: 'H2H', weight: 2, ... }]
   * ```
   */
  static buildEdges(
    messages: Array<{
      id: string;
      from: string;
      to: string[];
      timestamp: Date;
    }>,
    humanIds: Set<string>,
    botIds: Set<string>
  ): Edge[] {
    const edgeMap = new Map<string, Edge>();
    
    for (const msg of messages) {
      for (const target of msg.to) {
        if (msg.from === target) continue; // Skip self-loops
        
        const key = `${msg.from}-${target}`;
        
        if (!edgeMap.has(key)) {
          // Determine edge type
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
            is_cross_team: false, // Will be determined by team info if available
            message_ids: [],
          });
        }
        
        const edge = edgeMap.get(key)!;
        edge.weight++;
        edge.message_ids.push(msg.id);
      }
    }
    
    return Array.from(edgeMap.values());
  }
  
  /**
   * Update edge cross-team flags based on team information
   * 
   * @param edges - Array of edges
   * @param userTeams - Map of user ID to team name
   * @returns Updated edges with is_cross_team flags
   */
  static markCrossTeamEdges(
    edges: Edge[],
    userTeams: Map<string, string>
  ): Edge[] {
    for (const edge of edges) {
      const sourceTeam = userTeams.get(edge.source);
      const targetTeam = userTeams.get(edge.target);
      
      if (sourceTeam && targetTeam && sourceTeam !== targetTeam) {
        edge.is_cross_team = true;
      }
    }
    
    return edges;
  }
  
  /**
   * Build complete NetworkGraph
   * 
   * @param params - NetworkGraph construction parameters
   * @returns Complete NetworkGraph object
   * 
   * @example
   * ```typescript
   * const graph = NetworkGraphBuilder.build({
   *   graphId: 'my_network',
   *   description: 'My network description',
   *   startTime: new Date('2026-03-01'),
   *   endTime: new Date('2026-03-20'),
   *   humans: [...],
   *   bots: [...],
   *   edges: [...],
   *   messages: [...],
   * });
   * ```
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
