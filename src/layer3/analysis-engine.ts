/**
 * OCTO-ONA Layer 3: Analysis Engine
 * 
 * Core graph analysis using graphology.
 * Provides intermediate data for Layer 4 metrics.
 */

import Graph from 'graphology';
import { degreeCentrality } from 'graphology-metrics/centrality/degree';
import betweennessCentrality from 'graphology-metrics/centrality/betweenness';
import closenessCentrality from 'graphology-metrics/centrality/closeness';
import { NetworkGraph } from '../layer2/models';

// ============================================
// Type Definitions
// ============================================

export interface CentralityResults {
  degree: Record<string, number>;
  betweenness: Record<string, number>;
  closeness: Record<string, number>;
}

export interface AnalysisCache {
  centrality?: CentralityResults;
  graph?: Graph;
  [key: string]: unknown;
}

// ============================================
// AnalysisEngine Class
// ============================================

export class AnalysisEngine {
  private networkGraph: NetworkGraph;
  private cache: AnalysisCache = {};
  
  constructor(networkGraph: NetworkGraph) {
    this.networkGraph = networkGraph;
  }
  
  /**
   * Convert NetworkGraph to graphology Graph
   * 
   * Lazy initialization - only creates graph when needed.
   * Caches result for performance.
   * 
   * @returns graphology Graph instance
   */
  private getGraph(): Graph {
    if (this.cache.graph) {
      return this.cache.graph;
    }
    
    const graph = new Graph({ type: 'directed' });
    
    // Add nodes
    for (const node of this.networkGraph.human_nodes) {
      graph.addNode(node.id, {
        type: 'human',
        name: node.name,
        team: node.team,
        role: node.role,
      });
    }
    
    for (const node of this.networkGraph.ai_agent_nodes) {
      graph.addNode(node.id, {
        type: 'bot',
        name: node.bot_name,
        creator: node.creator_uid,
      });
    }
    
    // Add edges
    for (const edge of this.networkGraph.edges) {
      graph.addEdge(edge.source, edge.target, {
        weight: edge.weight,
        edge_type: edge.edge_type,
        is_cross_team: edge.is_cross_team,
      });
    }
    
    this.cache.graph = graph;
    console.log(`Graph created: ${graph.order} nodes, ${graph.size} edges`);
    
    return graph;
  }
  
  /**
   * Calculate all centrality metrics
   * 
   * Computes degree, betweenness, and closeness centrality.
   * Results are cached for performance.
   * 
   * @returns CentralityResults object
   */
  async computeCentrality(): Promise<CentralityResults> {
    if (this.cache.centrality) {
      console.log('Using cached centrality results');
      return this.cache.centrality;
    }
    
    const graph = this.getGraph();
    
    console.log('Computing centrality metrics...');
    const startTime = Date.now();
    
    const centrality: CentralityResults = {
      degree: degreeCentrality(graph) as Record<string, number>,
      betweenness: betweennessCentrality(graph) as Record<string, number>,
      closeness: closenessCentrality(graph) as Record<string, number>,
    };
    
    const duration = Date.now() - startTime;
    console.log(`Centrality computed in ${duration}ms`);
    
    this.cache.centrality = centrality;
    return centrality;
  }
  
  /**
   * Get basic graph statistics
   * 
   * @returns Object with node count, edge count, density
   */
  getGraphStats(): {
    nodes: number;
    edges: number;
    density: number;
    avgDegree: number;
  } {
    const graph = this.getGraph();
    
    const nodes = graph.order;
    const edges = graph.size;
    const maxEdges = nodes * (nodes - 1); // Directed graph
    const density = maxEdges > 0 ? edges / maxEdges : 0;
    const avgDegree = nodes > 0 ? (2 * edges) / nodes : 0;
    
    return { nodes, edges, density, avgDegree };
  }
  
  /**
   * Find nodes with highest centrality
   * 
   * @param metric - Centrality metric to sort by
   * @param limit - Number of top nodes to return
   * @returns Array of [nodeId, value] sorted by value descending
   */
  async getTopNodes(
    metric: 'degree' | 'betweenness' | 'closeness',
    limit: number = 10
  ): Promise<Array<[string, number]>> {
    const centrality = await this.computeCentrality();
    const values = centrality[metric];
    
    return Object.entries(values)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }
  
  /**
   * Clear cached results
   * 
   * Use when NetworkGraph changes.
   */
  clearCache(): void {
    this.cache = {};
    console.log('Analysis cache cleared');
  }
  
  // ============================================
  // Hub Score Calculation
  // ============================================
  
  /**
   * Calculate Hub Score for all nodes
   * 
   * Hub Score = Mentions Received / Messages Sent
   * 
   * Special cases:
   * - Sent = 0, Received > 0: HS = Infinity (pure authority)
   * - Sent = 0, Received = 0: HS = 0.0 (inactive)
   * 
   * @returns Record<node_id, hub_score>
   */
  calculateHubScore(): Record<string, number> {
    const mentions: Record<string, number> = {};
    const messagesSent: Record<string, number> = {};
    
    // Count messages sent and mentions received
    if (this.networkGraph.messages) {
      for (const msg of this.networkGraph.messages) {
        // Count sent messages
        messagesSent[msg.from_uid] = (messagesSent[msg.from_uid] || 0) + 1;
        
        // Count mentions (to_uids)
        for (const toUid of msg.to_uids) {
          mentions[toUid] = (mentions[toUid] || 0) + 1;
        }
      }
    }
    
    // Get all nodes
    const allNodes = new Set<string>([
      ...Object.keys(mentions),
      ...Object.keys(messagesSent),
    ]);
    
    // Calculate Hub Score
    const hubScores: Record<string, number> = {};
    
    for (const nodeId of allNodes) {
      const mReceived = mentions[nodeId] || 0;
      const mSent = messagesSent[nodeId] || 0;
      
      if (mSent === 0) {
        // Special case: only mentioned, never sent
        hubScores[nodeId] = mReceived > 0 ? Infinity : 0.0;
      } else {
        hubScores[nodeId] = mReceived / mSent;
      }
    }
    
    console.log(`Hub Score calculated for ${allNodes.size} nodes`);
    return hubScores;
  }
  
  /**
   * Classify connoisseur layer by Hub Score
   * 
   * @param hubScore - Hub Score value
   * @returns Layer label (L0-L5)
   */
  classifyConnoisseurLayer(hubScore: number): string {
    if (hubScore === Infinity) {
      return 'L4_技术裁判';
    } else if (hubScore > 3.0) {
      return 'L5_战略权威';
    } else if (hubScore >= 0.3) {
      return 'L2_主动管理';
    } else if (hubScore > 0) {
      return 'L1_纯执行';
    } else {
      return 'L0_无活动';
    }
  }
  
  /**
   * Get top nodes by Hub Score
   * 
   * @param limit - Number of top nodes
   * @returns Array of [nodeId, hubScore, layer] sorted by HS descending
   */
  getTopHubScores(limit: number = 10): Array<[string, number, string]> {
    const hubScores = this.calculateHubScore();
    
    return Object.entries(hubScores)
      .map(([nodeId, hs]) => [nodeId, hs, this.classifyConnoisseurLayer(hs)] as [string, number, string])
      .sort((a, b) => {
        // Infinity > any number
        if (a[1] === Infinity && b[1] === Infinity) return 0;
        if (a[1] === Infinity) return -1;
        if (b[1] === Infinity) return 1;
        return b[1] - a[1];
      })
      .slice(0, limit);
  }
  
  /**
   * Get Hub Score statistics with mentions/sent counts
   * 
   * Useful for verification and debugging.
   * 
   * @param nodeId - Target node ID
   * @returns { hubScore, mentionsReceived, messagesSent, layer }
   */
  getHubScoreDetails(nodeId: string): {
    hubScore: number;
    mentionsReceived: number;
    messagesSent: number;
    layer: string;
  } | null {
    let mentionsReceived = 0;
    let messagesSent = 0;
    
    if (this.networkGraph.messages) {
      for (const msg of this.networkGraph.messages) {
        if (msg.from_uid === nodeId) {
          messagesSent += 1;
        }
        
        if (msg.to_uids.includes(nodeId)) {
          mentionsReceived += 1;
        }
      }
    }
    
    const hubScore = messagesSent === 0
      ? (mentionsReceived > 0 ? Infinity : 0.0)
      : mentionsReceived / messagesSent;
    
    return {
      hubScore,
      mentionsReceived,
      messagesSent,
      layer: this.classifyConnoisseurLayer(hubScore),
    };
  }
  
  // ============================================
  // Connoisseurship Detection
  // ============================================
  
  /**
   * Detect connoisseurship messages in the network
   * 
   * Uses rule-based keyword detection (4 categories).
   * 
   * @returns Array of connoisseurship message IDs
   */
  detectConnoisseurshipMessages(): string[] {
    const { ConnoisseurDetector } = require('./connoisseur-detector');
    
    if (!this.networkGraph.messages) {
      return [];
    }
    
    const connoisseurshipMessages = ConnoisseurDetector.filterConnoisseurshipMessages(
      this.networkGraph.messages
    );
    
    console.log(`Detected ${connoisseurshipMessages.length}/${this.networkGraph.messages.length} connoisseurship messages`);
    
    return connoisseurshipMessages.map((msg: { id: string }) => msg.id);
  }
  
  /**
   * Calculate connoisseurship frequency for each user
   * 
   * Frequency = Connoisseurship Messages / Total Messages
   * 
   * @returns Record<uid, frequency>
   */
  calculateConnoisseurshipFrequency(): Record<string, number> {
    const { ConnoisseurDetector } = require('./connoisseur-detector');
    
    if (!this.networkGraph.messages) {
      return {};
    }
    
    const frequencies: Record<string, number> = {};
    
    // Group messages by user
    const messagesByUser: Record<string, Array<{ content: string }>> = {};
    
    for (const msg of this.networkGraph.messages) {
      if (!messagesByUser[msg.from_uid]) {
        messagesByUser[msg.from_uid] = [];
      }
      messagesByUser[msg.from_uid].push({ content: msg.content });
    }
    
    // Calculate frequency for each user
    for (const [uid, messages] of Object.entries(messagesByUser)) {
      frequencies[uid] = ConnoisseurDetector.calculateFrequency(messages);
    }
    
    console.log(`Calculated connoisseurship frequency for ${Object.keys(frequencies).length} users`);
    
    return frequencies;
  }
  
  /**
   * Get top connoisseurs by frequency
   * 
   * @param limit - Number of top users to return
   * @returns Array of [uid, frequency, messageCount]
   */
  getTopConnoisseurs(limit: number = 10): Array<[string, number, number]> {
    const frequencies = this.calculateConnoisseurshipFrequency();
    
    if (!this.networkGraph.messages) {
      return [];
    }
    
    // Count messages per user
    const messageCounts: Record<string, number> = {};
    for (const msg of this.networkGraph.messages) {
      messageCounts[msg.from_uid] = (messageCounts[msg.from_uid] || 0) + 1;
    }
    
    return Object.entries(frequencies)
      .map(([uid, freq]) => [uid, freq, messageCounts[uid] || 0] as [string, number, number])
      .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
      .slice(0, limit);
  }
  
  // ============================================
  // Advanced Graph Algorithms
  // ============================================
  
  /**
   * Detect communities using Louvain algorithm
   * 
   * Communities are groups of nodes more densely connected internally
   * than with the rest of the network.
   * 
   * @returns Record<nodeId, communityId>
   */
  detectCommunities(): Record<string, number> {
    const louvain = require('graphology-communities-louvain');
    const graph = this.getGraph();
    
    // Louvain requires undirected graph
    const undirectedGraph = graph.copy();
    undirectedGraph.setAttribute('type', 'undirected');
    
    const communities = louvain(undirectedGraph);
    
    const communityCount = new Set(Object.values(communities)).size;
    console.log(`Detected ${communityCount} communities`);
    
    return communities;
  }
  
  /**
   * Get community summary
   * 
   * @returns Array of { communityId, members, size }
   */
  getCommunitySummary(): Array<{
    communityId: number;
    members: string[];
    size: number;
    humanCount: number;
    botCount: number;
  }> {
    const communities = this.detectCommunities();
    
    // Group by community ID
    const grouped = new Map<number, string[]>();
    for (const [nodeId, communityId] of Object.entries(communities)) {
      if (!grouped.has(communityId)) {
        grouped.set(communityId, []);
      }
      grouped.get(communityId)!.push(nodeId);
    }
    
    // Build summary
    const summary = [];
    for (const [communityId, members] of grouped.entries()) {
      const humanCount = members.filter(id =>
        this.networkGraph.human_nodes.some(n => n.id === id)
      ).length;
      const botCount = members.filter(id =>
        this.networkGraph.ai_agent_nodes.some(n => n.id === id)
      ).length;
      
      summary.push({
        communityId,
        members,
        size: members.length,
        humanCount,
        botCount,
      });
    }
    
    return summary.sort((a, b) => b.size - a.size); // Sort by size descending
  }
}
