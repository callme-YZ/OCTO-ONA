/**
 * Recommender System
 * 
 * Suggests collaboration targets based on network structure and metrics.
 */

import { NetworkGraph } from '../layer2/models';
import { StructuredMetricsResult } from '../layer4/metrics-calculator';

export interface Recommendation {
  targetId: string;
  targetName: string;
  score: number; // 0-100
  reason: string;
  type: 'hub_score' | 'network_structure' | 'connoisseur' | 'similar_context';
}

/**
 * Recommender
 * 
 * @example
 * ```typescript
 * const recommender = new Recommender();
 * 
 * const recommendations = recommender.suggestMentions(
 *   'user123',
 *   graph,
 *   metrics,
 *   { limit: 5 }
 * );
 * 
 * for (const rec of recommendations) {
 *   console.log(`@${rec.targetName}: ${rec.reason} (score: ${rec.score})`);
 * }
 * ```
 */
export class Recommender {
  /**
   * Suggest who the user should @mention
   */
  suggestMentions(
    userId: string,
    graph: NetworkGraph,
    metrics: StructuredMetricsResult,
    options: { limit?: number } = {}
  ): Recommendation[] {
    const limit = options.limit ?? 5;
    const recommendations: Recommendation[] = [];
    
    // 1. Hub score based recommendations
    recommendations.push(...this.recommendByHubScore(userId, metrics));
    
    // 2. Network structure based recommendations
    recommendations.push(...this.recommendByNetworkStructure(userId, graph, metrics));
    
    // 3. Connoisseur based recommendations
    recommendations.push(...this.recommendByConnoisseurship(userId, metrics));
    
    // 4. Similar context based recommendations
    recommendations.push(...this.recommendBySimilarContext(userId, graph, metrics));
    
    // Deduplicate and sort by score
    const uniqueRecs = this.deduplicateRecommendations(recommendations);
    uniqueRecs.sort((a, b) => b.score - a.score);
    
    return uniqueRecs.slice(0, limit);
  }
  
  private recommendByHubScore(
    userId: string,
    metrics: StructuredMetricsResult
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Recommend top 3 hub score nodes (excluding self)
    const topHubScores = metrics.nodeMetrics
      .filter(n => n.id !== userId && n.hubScore !== Infinity)
      .sort((a, b) => b.hubScore - a.hubScore)
      .slice(0, 3);
    
    for (const node of topHubScores) {
      recommendations.push({
        targetId: node.id,
        targetName: node.name,
        score: Math.min(100, node.hubScore * 20), // Scale to 0-100
        reason: `High Hub Score (${node.hubScore.toFixed(2)}) - Influential member`,
        type: 'hub_score',
      });
    }
    
    return recommendations;
  }
  
  private recommendByNetworkStructure(
    userId: string,
    graph: NetworkGraph,
    metrics: StructuredMetricsResult
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Find nodes with high betweenness (bridges/connectors)
    const bridges = metrics.nodeMetrics
      .filter(n => n.id !== userId && n.betweennessCentrality > 0.1)
      .sort((a, b) => b.betweennessCentrality - a.betweennessCentrality)
      .slice(0, 3);
    
    for (const node of bridges) {
      recommendations.push({
        targetId: node.id,
        targetName: node.name,
        score: Math.min(100, node.betweennessCentrality * 200),
        reason: `Network Bridge (betweenness: ${node.betweennessCentrality.toFixed(3)}) - Connects different groups`,
        type: 'network_structure',
      });
    }
    
    return recommendations;
  }
  
  private recommendByConnoisseurship(
    userId: string,
    metrics: StructuredMetricsResult
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Recommend Layer 4-5 connoisseurs
    const connoisseurs = metrics.nodeMetrics
      .filter(n => n.id !== userId && n.connoisseurshipLayer >= 4)
      .sort((a, b) => b.connoisseurshipLayer - a.connoisseurshipLayer)
      .slice(0, 2);
    
    for (const node of connoisseurs) {
      const layerName = node.connoisseurshipLayer === 5 ? 'Authority' : 'Core Connoisseur';
      recommendations.push({
        targetId: node.id,
        targetName: node.name,
        score: node.connoisseurshipLayer * 18, // L4=72, L5=90
        reason: `${layerName} (Layer ${node.connoisseurshipLayer}) - Expert in domain`,
        type: 'connoisseur',
      });
    }
    
    return recommendations;
  }
  
  private recommendBySimilarContext(
    userId: string,
    graph: NetworkGraph,
    metrics: StructuredMetricsResult
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Find users the target has interacted with recently
    const userMessages = (graph.messages || []).filter(m => m.from_uid === userId);
    const recentContexts = new Set(userMessages.slice(-10).map(m => m.context_id).filter(c => c));
    
    if (recentContexts.size === 0) return recommendations;
    
    // Find active users in same contexts
    const contextPeers = new Map<string, number>();
    
    for (const msg of graph.messages || []) {
      if (msg.context_id && recentContexts.has(msg.context_id) && msg.from_uid !== userId) {
        contextPeers.set(msg.from_uid, (contextPeers.get(msg.from_uid) || 0) + 1);
      }
    }
    
    // Get top 2 active peers
    const topPeers = Array.from(contextPeers.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
    
    for (const [peerId, count] of topPeers) {
      const peerNode = metrics.nodeMetrics.find(n => n.id === peerId);
      if (peerNode) {
        recommendations.push({
          targetId: peerId,
          targetName: peerNode.name,
          score: Math.min(100, count * 5),
          reason: `Active in same contexts (${count} messages) - Likely relevant`,
          type: 'similar_context',
        });
      }
    }
    
    return recommendations;
  }
  
  private deduplicateRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const seen = new Map<string, Recommendation>();
    
    for (const rec of recommendations) {
      const existing = seen.get(rec.targetId);
      if (!existing || rec.score > existing.score) {
        seen.set(rec.targetId, rec);
      }
    }
    
    return Array.from(seen.values());
  }
}
