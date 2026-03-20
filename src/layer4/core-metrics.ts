/**
 * OCTO-ONA Core Metrics Definitions
 * 
 * P0 priority metrics (12 metrics).
 */

import { MetricDefinition } from './metrics-calculator';

// ============================================
// L1: Network Metrics (3 P0 metrics)
// ============================================

export const L1_1_DEGREE_CENTRALITY: MetricDefinition = {
  id: 'L1.1',
  name: '度中心性',
  category: 'network',
  priority: 'P0',
  unit: 'score',
  description: '节点的连接数，反映直接影响力',
  calculator: async (graph, engine) => {
    const centrality = await engine.computeCentrality();
    return centrality.degree;
  },
};

export const L1_2_BETWEENNESS_CENTRALITY: MetricDefinition = {
  id: 'L1.2',
  name: '中介中心性',
  category: 'network',
  priority: 'P0',
  unit: 'score',
  description: '节点的桥梁作用，反映信息中转能力',
  calculator: async (graph, engine) => {
    const centrality = await engine.computeCentrality();
    return centrality.betweenness;
  },
};

export const L1_4_NETWORK_DENSITY: MetricDefinition = {
  id: 'L1.4',
  name: '网络密度',
  category: 'network',
  priority: 'P0',
  unit: 'ratio',
  description: '实际边数 / 最大可能边数',
  calculator: async (graph, engine) => {
    const stats = engine.getGraphStats();
    return stats.density;
  },
};

// ============================================
// L2: Collaboration Metrics (2 P0 metrics)
// ============================================

export const L2_1_BOT_FUNCTIONAL_TAGS: MetricDefinition = {
  id: 'L2.1',
  name: 'Bot功能标签',
  category: 'collaboration',
  priority: 'P0',
  unit: 'tags',
  description: 'Bot的功能标签（T1-T5）',
  calculator: async (graph, engine) => {
    const { BotTagger } = require('./bot-tagger');
    const tagger = new BotTagger(graph, engine);
    
    const results = await tagger.tagAllBots();
    
    // Convert to Record<botId, tags[]>
    const tags: Record<string, string[]> = {};
    for (const result of results) {
      tags[result.botId] = result.tags;
    }
    
    return tags;
  },
};

export const L2_2_H2B_COLLABORATION_RATIO: MetricDefinition = {
  id: 'L2.2',
  name: '人机协作比例',
  category: 'collaboration',
  priority: 'P0',
  unit: 'ratio',
  description: '人与Bot交互边 / 总边数',
  calculator: async (graph, engine) => {
    const h2bEdges = graph.edges.filter(e => e.edge_type === 'H2B' || e.edge_type === 'B2H');
    const totalEdges = graph.edges.length;
    
    return totalEdges > 0 ? h2bEdges.length / totalEdges : 0;
  },
};

// ============================================
// L3: Connoisseurship Metrics (5 P0 metrics)
// ============================================

export const L3_1_CONNOISSEURSHIP_FREQUENCY: MetricDefinition = {
  id: 'L3.1',
  name: '品鉴行为频率',
  category: 'connoisseurship',
  priority: 'P0',
  unit: 'ratio',
  description: '品鉴消息占比',
  calculator: async (graph, engine) => {
    const frequencies = engine.calculateConnoisseurshipFrequency();
    return frequencies;
  },
};

export const L3_2_CONNOISSEURSHIP_REACH: MetricDefinition = {
  id: 'L3.2',
  name: '品鉴影响广度',
  category: 'connoisseurship',
  priority: 'P0',
  unit: 'nodes',
  description: '品鉴消息触达的节点数',
  calculator: async (graph, engine) => {
    const connoisseurshipMsgIds = engine.detectConnoisseurshipMessages();
    const connoisseurshipMsgs = (graph.messages || []).filter(m => 
      connoisseurshipMsgIds.includes(m.id)
    );
    
    // Count unique recipients
    const recipients = new Set<string>();
    for (const msg of connoisseurshipMsgs) {
      for (const uid of msg.to_uids) {
        recipients.add(uid);
      }
    }
    
    return recipients.size;
  },
};

export const L3_3_CONNOISSEURSHIP_CONVERSION: MetricDefinition = {
  id: 'L3.3',
  name: '品鉴执行转化',
  category: 'connoisseurship',
  priority: 'P0',
  unit: 'ratio',
  description: '品鉴后有Bot响应的比例 (30分钟内)',
  calculator: async (graph, engine) => {
    if (!graph.messages) return {};
    
    const connoisseurshipMsgIds = engine.detectConnoisseurshipMessages();
    const connoisseurshipMsgs = graph.messages.filter(m => 
      connoisseurshipMsgIds.includes(m.id)
    );
    
    // Get bot IDs
    const botIds = new Set(graph.ai_agent_nodes.map(b => b.id));
    
    // Calculate conversion per user
    const conversions: Record<string, number> = {};
    
    // Group connoisseurship messages by user
    const msgsByUser = new Map<string, typeof connoisseurshipMsgs>();
    for (const msg of connoisseurshipMsgs) {
      if (!msgsByUser.has(msg.from_uid)) {
        msgsByUser.set(msg.from_uid, []);
      }
      msgsByUser.get(msg.from_uid)!.push(msg);
    }
    
    // Check each user's conversion
    for (const [userId, userMsgs] of msgsByUser.entries()) {
      let executedCount = 0;
      
      for (const cMsg of userMsgs) {
        // Check if Bot responded within 30 minutes
        const window30min = new Date(cMsg.timestamp.getTime() + 30 * 60 * 1000);
        
        const botResponded = graph.messages.some(msg => {
          return (
            botIds.has(msg.from_uid) &&
            msg.timestamp > cMsg.timestamp &&
            msg.timestamp <= window30min &&
            msg.to_uids.includes(userId) // Bot replied to the user
          );
        });
        
        if (botResponded) {
          executedCount++;
        }
      }
      
      conversions[userId] = userMsgs.length > 0 
        ? executedCount / userMsgs.length 
        : 0.0;
    }
    
    return conversions;
  },
};

export const L3_5_HUB_SCORE: MetricDefinition = {
  id: 'L3.5',
  name: 'Hub Score',
  category: 'connoisseurship',
  priority: 'P0',
  unit: 'ratio',
  description: '被@次数 / 发送消息数 (影响力vs活跃度)',
  calculator: async (graph, engine) => {
    const hubScores = engine.calculateHubScore();
    return hubScores;
  },
};

// ============================================
// Bot Tags (P0: T1-T5)
// ============================================

export const T5_HIGH_ACTIVITY: MetricDefinition = {
  id: 'T5',
  name: '高活跃Bot',
  category: 'bot_tag',
  priority: 'P0',
  unit: 'boolean',
  description: '消息数 > P75的Bot',
  calculator: async (graph, engine) => {
    if (!graph.messages) return {};
    
    // Count messages per bot
    const botMessageCounts: Record<string, number> = {};
    for (const msg of graph.messages) {
      const isBot = graph.ai_agent_nodes.some(b => b.id === msg.from_uid);
      if (isBot) {
        botMessageCounts[msg.from_uid] = (botMessageCounts[msg.from_uid] || 0) + 1;
      }
    }
    
    // Calculate P75
    const counts = Object.values(botMessageCounts);
    if (counts.length === 0) return {};
    
    counts.sort((a, b) => a - b);
    const p75Index = Math.floor(counts.length * 0.75);
    const p75 = counts[p75Index];
    
    // Tag bots > P75
    const tags: Record<string, boolean> = {};
    for (const [botId, count] of Object.entries(botMessageCounts)) {
      tags[botId] = count > p75;
    }
    
    return tags;
  },
};

// ============================================
// Export all P0 metrics
// ============================================

export const CORE_METRICS: MetricDefinition[] = [
  // Network (3)
  L1_1_DEGREE_CENTRALITY,
  L1_2_BETWEENNESS_CENTRALITY,
  L1_4_NETWORK_DENSITY,
  
  // Collaboration (2)
  L2_1_BOT_FUNCTIONAL_TAGS,
  L2_2_H2B_COLLABORATION_RATIO,
  
  // Connoisseurship (4)
  L3_1_CONNOISSEURSHIP_FREQUENCY,
  L3_2_CONNOISSEURSHIP_REACH,
  L3_3_CONNOISSEURSHIP_CONVERSION,
  L3_5_HUB_SCORE,
  
  // Bot Tags (1)
  T5_HIGH_ACTIVITY,
];

// ============================================
// L3: Connoisseurship Metrics (P1: L3.4)
// ============================================

export const L3_4_CONNOISSEURSHIP_AMPLIFICATION: MetricDefinition = {
  id: 'L3.4',
  name: '品鉴网络放大',
  category: 'connoisseurship',
  priority: 'P1',
  unit: 'ratio',
  description: '品鉴消息被其他人转述的次数比例',
  calculator: async (graph, engine) => {
    if (!graph.messages) return {};
    
    const connoisseurshipMsgIds = engine.detectConnoisseurshipMessages();
    const connoisseurshipMsgs = graph.messages.filter(m => 
      connoisseurshipMsgIds.includes(m.id)
    );
    
    // Calculate amplification per user
    const amplifications: Record<string, number> = {};
    
    // Group by user
    const msgsByUser = new Map<string, typeof connoisseurshipMsgs>();
    for (const msg of connoisseurshipMsgs) {
      if (!msgsByUser.has(msg.from_uid)) {
        msgsByUser.set(msg.from_uid, []);
      }
      msgsByUser.get(msg.from_uid)!.push(msg);
    }
    
    // Get human nodes for name matching
    const humanNodes = new Map(
      graph.human_nodes.map(h => [h.id, h.name || h.id])
    );
    
    for (const [userId, userMsgs] of msgsByUser.entries()) {
      const userName = humanNodes.get(userId);
      if (!userName) continue;
      
      let retellingCount = 0;
      
      // Check if user's name is mentioned in other messages
      for (const msg of graph.messages) {
        if (msg.from_uid === userId) continue; // Skip own messages
        
        // Simple retelling detection: message contains user's name
        if (msg.content.includes(userName)) {
          retellingCount++;
        }
      }
      
      amplifications[userId] = userMsgs.length > 0 
        ? retellingCount / userMsgs.length 
        : 0.0;
    }
    
    return amplifications;
  },
};

// ============================================
// Additional P1 Network Metrics
// ============================================

export const L1_3_CLOSENESS_CENTRALITY: MetricDefinition = {
  id: 'L1.3',
  name: '接近中心性',
  category: 'network',
  priority: 'P1',
  unit: 'score',
  description: '节点到其他节点的平均距离',
  calculator: async (graph, engine) => {
    const centrality = await engine.computeCentrality();
    return centrality.closeness;
  },
};

// ============================================
// Export Enhanced Metrics (P0 + P1)
// ============================================

export const ENHANCED_METRICS: MetricDefinition[] = [
  ...CORE_METRICS,
  
  // P1 Connoisseurship
  L3_4_CONNOISSEURSHIP_AMPLIFICATION,
  
  // P1 Network
  L1_3_CLOSENESS_CENTRALITY,
];

// ============================================
// Additional P0 Network Metrics
// ============================================

export const L1_5_LEADERSHIP_DISTANCE: MetricDefinition = {
  id: 'L1.5',
  name: '领导层距离',
  category: 'network',
  priority: 'P0',
  unit: 'percentage',
  description: '2步内可达决策层的人员占比',
  calculator: async (graph, engine) => {
    // Define leadership nodes (simplified: use team='leadership' or high Hub Score)
    const hubScores = engine.calculateHubScore();
    const sortedByHS = Object.entries(hubScores)
      .sort((a, b) => {
        if (a[1] === Infinity && b[1] === Infinity) return 0;
        if (a[1] === Infinity) return -1;
        if (b[1] === Infinity) return 1;
        return b[1] - a[1];
      });
    
    // Top 10% as leadership
    const leadershipCount = Math.max(1, Math.floor(sortedByHS.length * 0.1));
    const leadershipNodes = new Set(
      sortedByHS.slice(0, leadershipCount).map(([id]) => id)
    );
    
    // Get human nodes
    const humanNodes = graph.human_nodes.map(h => h.id);
    const nonLeadership = humanNodes.filter(id => !leadershipNodes.has(id));
    
    if (nonLeadership.length === 0) return 100; // All are leaders
    
    // Check 2-hop reachability using graphology
    const g = engine['getGraph'](); // Access private method
    let reachableCount = 0;
    
    for (const nodeId of nonLeadership) {
      let isReachable = false;
      
      // Check 1-hop
      try {
        g.forEachNeighbor(nodeId, (neighbor: string) => {
          if (leadershipNodes.has(neighbor)) {
            isReachable = true;
          }
        });
      } catch (e) {
        // Node not in graph
        continue;
      }
      
      // Check 2-hop
      if (!isReachable) {
        try {
          g.forEachNeighbor(nodeId, (neighbor1: string) => {
            g.forEachNeighbor(neighbor1, (neighbor2: string) => {
              if (leadershipNodes.has(neighbor2)) {
                isReachable = true;
              }
            });
          });
        } catch (e) {
          // Ignore
        }
      }
      
      if (isReachable) reachableCount++;
    }
    
    return (reachableCount / nonLeadership.length) * 100;
  },
};

export const L1_6_SILO_INDEX: MetricDefinition = {
  id: 'L1.6',
  name: '孤岛指数',
  category: 'network',
  priority: 'P0',
  unit: 'percentage',
  description: '弱连接团队占比（跨团队边数<平均*0.5）',
  calculator: async (graph, engine) => {
    // Extract teams from human nodes
    const teams = new Set<string>();
    const nodeTeam = new Map<string, string>();
    
    for (const node of graph.human_nodes) {
      const team = (node as any).team || 'default';
      teams.add(team);
      nodeTeam.set(node.id, team);
    }
    
    if (teams.size <= 1) return 0; // No silos if only one team
    
    // Count cross-team edges per team
    const teamCrossEdges = new Map<string, number>();
    for (const team of teams) {
      teamCrossEdges.set(team, 0);
    }
    
    for (const edge of graph.edges) {
      const sourceTeam = nodeTeam.get(edge.source);
      const targetTeam = nodeTeam.get(edge.target);
      
      if (sourceTeam && targetTeam && sourceTeam !== targetTeam) {
        teamCrossEdges.set(sourceTeam, (teamCrossEdges.get(sourceTeam) || 0) + 1);
        teamCrossEdges.set(targetTeam, (teamCrossEdges.get(targetTeam) || 0) + 1);
      }
    }
    
    // Calculate average
    const counts = Array.from(teamCrossEdges.values());
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    
    // Weak teams: cross-edges < avg * 0.5
    const weakTeams = counts.filter(c => c < avg * 0.5).length;
    
    return (weakTeams / teams.size) * 100;
  },
};

export const L1_7_BURNOUT_RISK: MetricDefinition = {
  id: 'L1.7',
  name: '过载风险',
  category: 'network',
  priority: 'P0',
  unit: 'count',
  description: '中介中心性>0.3的节点数（过载风险人员）',
  calculator: async (graph, engine) => {
    const centrality = await engine.computeCentrality();
    
    const atRisk = Object.values(centrality.betweenness).filter(
      bc => bc > 0.3
    ).length;
    
    return atRisk;
  },
};

// ============================================
// Update CORE_METRICS to include new P0
// ============================================

export const ALL_CORE_METRICS: MetricDefinition[] = [
  // Network (6 P0)
  L1_1_DEGREE_CENTRALITY,
  L1_2_BETWEENNESS_CENTRALITY,
  L1_4_NETWORK_DENSITY,
  L1_5_LEADERSHIP_DISTANCE,
  L1_6_SILO_INDEX,
  L1_7_BURNOUT_RISK,
  
  // Collaboration (2 P0)
  L2_1_BOT_FUNCTIONAL_TAGS,
  L2_2_H2B_COLLABORATION_RATIO,
  
  // Connoisseurship (4 P0)
  L3_1_CONNOISSEURSHIP_FREQUENCY,
  L3_2_CONNOISSEURSHIP_REACH,
  L3_3_CONNOISSEURSHIP_CONVERSION,
  L3_5_HUB_SCORE,
  
  // Bot Tags (1 P0)
  T5_HIGH_ACTIVITY,
];
