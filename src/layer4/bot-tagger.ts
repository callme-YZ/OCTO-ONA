/**
 * OCTO-ONA Bot Functional Tagger
 * 
 * Implements T1-T5 bot tagging algorithms.
 */

import { NetworkGraph, AIAgentNode } from '../layer2/models';
import { AnalysisEngine } from '../layer3/analysis-engine';

// ============================================
// Type Definitions
// ============================================

export type BotTag = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';

export interface BotTagResult {
  botId: string;
  botName: string;
  tags: BotTag[];
  tagDetails: {
    [key in BotTag]?: {
      matched: boolean;
      reason: string;
      metrics?: Record<string, number>;
    };
  };
}

// ============================================
// BotTagger Class
// ============================================

export class BotTagger {
  private graph: NetworkGraph;
  private engine: AnalysisEngine;
  
  constructor(graph: NetworkGraph, engine: AnalysisEngine) {
    this.graph = graph;
    this.engine = engine;
  }
  
  /**
   * Tag all bots in the network
   * 
   * @returns Array of BotTagResult
   */
  async tagAllBots(): Promise<BotTagResult[]> {
    const results: BotTagResult[] = [];
    
    for (const bot of this.graph.ai_agent_nodes) {
      const result = await this.tagBot(bot);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Tag a single bot
   * 
   * @param bot - Bot node to tag
   * @returns BotTagResult
   */
  async tagBot(bot: AIAgentNode): Promise<BotTagResult> {
    const result: BotTagResult = {
      botId: bot.id,
      botName: bot.bot_name,
      tags: [],
      tagDetails: {},
    };
    
    // T1: Cross-Team Connector
    const t1 = await this.checkT1(bot);
    if (t1.matched) {
      result.tags.push('T1');
    }
    result.tagDetails['T1'] = t1; // Always include details
    
    // T2: Intra-Team Hub
    const t2 = await this.checkT2(bot);
    if (t2.matched) {
      result.tags.push('T2');
    }
    result.tagDetails['T2'] = t2;
    
    // T3: Human Proxy
    const t3 = await this.checkT3(bot);
    if (t3.matched) {
      result.tags.push('T3');
    }
    result.tagDetails['T3'] = t3;
    
    // T4: Information Aggregator
    const t4 = await this.checkT4(bot);
    if (t4.matched) {
      result.tags.push('T4');
    }
    result.tagDetails['T4'] = t4;
    
    // T5: High Activity
    const t5 = await this.checkT5(bot);
    if (t5.matched) {
      result.tags.push('T5');
    }
    result.tagDetails['T5'] = t5;
    
    return result;
  }
  
  // ============================================
  // T1: Cross-Team Connector
  // ============================================
  
  private async checkT1(bot: AIAgentNode): Promise<{
    matched: boolean;
    reason: string;
    metrics?: Record<string, number>;
  }> {
    const centrality = await this.engine.computeCentrality();
    const bc = centrality.betweenness[bot.id] || 0;
    
    // Get connected teams
    const connectedTeams = this.getConnectedTeams(bot);
    
    // Thresholds (Beta: prioritize team count over BC for small networks)
    const BC_THRESHOLD = 0.05; // Lowered for small networks
    const MIN_TEAMS = 3;
    
    // Match if connects >=3 teams (BC check optional for small networks)
    const matched = connectedTeams.size >= MIN_TEAMS && bc >= 0; // BC>=0 always true
    
    return {
      matched,
      reason: matched
        ? `Connects ${connectedTeams.size} teams (BC=${bc.toFixed(3)})`
        : `Only connects ${connectedTeams.size} teams (<${MIN_TEAMS})`,
      metrics: { bc, teamCount: connectedTeams.size },
    };
  }
  
  private getConnectedTeams(bot: AIAgentNode): Set<string> {
    const teams = new Set<string>();
    
    for (const edge of this.graph.edges) {
      if (edge.source === bot.id || edge.target === bot.id) {
        const otherId = edge.source === bot.id ? edge.target : edge.source;
        const human = this.graph.human_nodes.find(h => h.id === otherId);
        
        if (human && (human as any).team) {
          teams.add((human as any).team);
        }
      }
    }
    
    return teams;
  }
  
  // ============================================
  // T2: Intra-Team Hub
  // ============================================
  
  private async checkT2(bot: AIAgentNode): Promise<{
    matched: boolean;
    reason: string;
    metrics?: Record<string, number>;
  }> {
    const centrality = await this.engine.computeCentrality();
    const degree = centrality.degree[bot.id] || 0;
    
    // Calculate cross-team edge ratio
    const crossRatio = this.getCrossTeamEdgeRatio(bot);
    
    // Thresholds
    const DEGREE_THRESHOLD = 0.5; // Beta: fixed threshold
    const MAX_CROSS_RATIO = 0.3;
    
    const matched = degree > DEGREE_THRESHOLD && crossRatio < MAX_CROSS_RATIO;
    
    return {
      matched,
      reason: matched
        ? `Degree=${degree.toFixed(3)}, crossRatio=${crossRatio.toFixed(2)}`
        : `Degree=${degree.toFixed(3)} (<=${DEGREE_THRESHOLD}) or crossRatio=${crossRatio.toFixed(2)} (>=${MAX_CROSS_RATIO})`,
      metrics: { degree, crossRatio },
    };
  }
  
  private getCrossTeamEdgeRatio(bot: AIAgentNode): number {
    const primaryTeam = this.getPrimaryTeam(bot);
    if (!primaryTeam) return 0;
    
    let totalEdges = 0;
    let crossTeamEdges = 0;
    
    for (const edge of this.graph.edges) {
      if (edge.source === bot.id || edge.target === bot.id) {
        const otherId = edge.source === bot.id ? edge.target : edge.source;
        const human = this.graph.human_nodes.find(h => h.id === otherId);
        
        if (human) {
          totalEdges++;
          if ((human as any).team !== primaryTeam) {
            crossTeamEdges++;
          }
        }
      }
    }
    
    return totalEdges > 0 ? crossTeamEdges / totalEdges : 0;
  }
  
  private getPrimaryTeam(bot: AIAgentNode): string | null {
    const teamCounts: Record<string, number> = {};
    
    for (const edge of this.graph.edges) {
      if (edge.source === bot.id || edge.target === bot.id) {
        const otherId = edge.source === bot.id ? edge.target : edge.source;
        const human = this.graph.human_nodes.find(h => h.id === otherId);
        
        if (human && (human as any).team) {
          const team = (human as any).team;
          teamCounts[team] = (teamCounts[team] || 0) + 1;
        }
      }
    }
    
    if (Object.keys(teamCounts).length === 0) return null;
    
    return Object.entries(teamCounts).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  }
  
  // ============================================
  // T3: Human Proxy
  // ============================================
  
  private async checkT3(bot: AIAgentNode): Promise<{
    matched: boolean;
    reason: string;
    metrics?: Record<string, number>;
  }> {
    // Find max edge weight
    let maxWeight = 0;
    let primaryHumanId = '';
    
    for (const edge of this.graph.edges) {
      if ((edge.source === bot.id || edge.target === bot.id) && edge.weight) {
        if (edge.weight > maxWeight) {
          maxWeight = edge.weight;
          primaryHumanId = edge.source === bot.id ? edge.target : edge.source;
        }
      }
    }
    
    // Calculate P90 threshold of all bot edge weights
    const allBotWeights: number[] = [];
    for (const botNode of this.graph.ai_agent_nodes) {
      for (const edge of this.graph.edges) {
        if ((edge.source === botNode.id || edge.target === botNode.id) && edge.weight) {
          allBotWeights.push(edge.weight);
        }
      }
    }
    
    allBotWeights.sort((a, b) => a - b);
    const p90Index = Math.floor(allBotWeights.length * 0.9);
    const p90 = allBotWeights[p90Index] || 0;
    
    const matched = maxWeight > p90;
    
    return {
      matched,
      reason: matched
        ? `Max edge weight=${maxWeight} > P90=${p90} (proxy for ${primaryHumanId})`
        : `Max weight=${maxWeight} <= P90=${p90}`,
      metrics: { maxWeight, p90 },
    };
  }
  
  // ============================================
  // T4: Information Aggregator
  // ============================================
  
  private async checkT4(bot: AIAgentNode): Promise<{
    matched: boolean;
    reason: string;
    metrics?: Record<string, number>;
  }> {
    const centrality = await this.engine.computeCentrality();
    const degree = centrality.degree[bot.id] || 0;
    
    // Calculate in/out ratio (messages received / sent)
    let messagesReceived = 0;
    let messagesSent = 0;
    
    if (this.graph.messages) {
      for (const msg of this.graph.messages) {
        if (msg.from_uid === bot.id) {
          messagesSent++;
        }
        if (msg.to_uids.includes(bot.id)) {
          messagesReceived++;
        }
      }
    }
    
    const inOutRatio = messagesSent > 0 ? messagesReceived / messagesSent : 0;
    
    // Thresholds
    const DEGREE_THRESHOLD = 0.5; // Beta: P75 approximation
    const MIN_IN_OUT_RATIO = 1.0; // Receives more than sends
    
    const matched = degree > DEGREE_THRESHOLD && inOutRatio > MIN_IN_OUT_RATIO;
    
    return {
      matched,
      reason: matched
        ? `Degree=${degree.toFixed(3)}, in/out=${inOutRatio.toFixed(2)}`
        : `Degree=${degree.toFixed(3)} or in/out=${inOutRatio.toFixed(2)} (<=${MIN_IN_OUT_RATIO})`,
      metrics: { degree, inOutRatio, messagesReceived, messagesSent },
    };
  }
  
  // ============================================
  // T5: High Activity
  // ============================================
  
  private async checkT5(bot: AIAgentNode): Promise<{
    matched: boolean;
    reason: string;
    metrics?: Record<string, number>;
  }> {
    if (!this.graph.messages) {
      return { matched: false, reason: 'No messages data' };
    }
    
    // Count messages per bot
    const botMessageCounts: Record<string, number> = {};
    for (const msg of this.graph.messages) {
      if (this.graph.ai_agent_nodes.some(b => b.id === msg.from_uid)) {
        botMessageCounts[msg.from_uid] = (botMessageCounts[msg.from_uid] || 0) + 1;
      }
    }
    
    const thisCount = botMessageCounts[bot.id] || 0;
    
    // Calculate P75
    const counts = Object.values(botMessageCounts);
    if (counts.length === 0) {
      return { matched: false, reason: 'No bot messages' };
    }
    
    counts.sort((a, b) => a - b);
    const p75Index = Math.floor(counts.length * 0.75);
    const p75 = counts[p75Index];
    
    // Beta: Use >= instead of > to handle edge cases
    const matched = thisCount >= p75 && thisCount > 0;
    
    return {
      matched,
      reason: matched
        ? `Messages=${thisCount} >= P75=${p75}`
        : `Messages=${thisCount} < P75=${p75}`,
      metrics: { messageCount: thisCount, p75 },
    };
  }
}
