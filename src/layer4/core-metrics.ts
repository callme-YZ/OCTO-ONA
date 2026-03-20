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
  description: 'Bot的功能标签（T1-T8）',
  calculator: async (graph, engine) => {
    // TODO: Implement bot tagging logic
    // For now, return placeholder
    const tags: Record<string, string[]> = {};
    
    for (const bot of graph.ai_agent_nodes) {
      tags[bot.id] = bot.functional_tags || [];
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
  description: '品鉴后有执行动作的比例',
  calculator: async (graph, engine) => {
    // TODO: Implement conversion tracking
    // For now, return placeholder
    return 0.0;
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
