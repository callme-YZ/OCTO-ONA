/**
 * Health Monitor
 * 
 * Detects network health issues and provides recommendations.
 */

import { NetworkGraph } from '../layer2/models';
import { StructuredMetricsResult } from '../layer4/metrics-calculator';

export interface HealthReport {
  score: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  issues: {
    type: 'isolated_nodes' | 'overload_risk' | 'connoisseur_deficit' | 'team_fragmentation';
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedNodes: string[];
    recommendation: string;
  }[];
  timestamp: Date;
}

/**
 * HealthMonitor
 * 
 * @example
 * ```typescript
 * const monitor = new HealthMonitor();
 * 
 * const report = monitor.detectAnomalies(graph, metrics);
 * 
 * console.log(`Health score: ${report.score}/100`);
 * console.log(`Risk level: ${report.riskLevel}`);
 * 
 * for (const issue of report.issues) {
 *   console.log(`- ${issue.type}: ${issue.description}`);
 * }
 * ```
 */
export class HealthMonitor {
  /**
   * Detect network health anomalies
   */
  detectAnomalies(graph: NetworkGraph, metrics: StructuredMetricsResult): HealthReport {
    const issues: HealthReport['issues'] = [];
    
    // 1. Detect isolated nodes
    const isolatedIssue = this.detectIsolatedNodes(graph, metrics);
    if (isolatedIssue) issues.push(isolatedIssue);
    
    // 2. Detect overload risk
    const overloadIssue = this.detectOverloadRisk(graph, metrics);
    if (overloadIssue) issues.push(overloadIssue);
    
    // 3. Detect connoisseur deficit
    const connoisseurIssue = this.detectConnoisseurDeficit(metrics);
    if (connoisseurIssue) issues.push(connoisseurIssue);
    
    // 4. Detect team fragmentation
    const fragmentationIssue = this.detectTeamFragmentation(graph);
    if (fragmentationIssue) issues.push(fragmentationIssue);
    
    // Calculate health score
    const score = this.calculateHealthScore(issues);
    
    // Determine risk level
    const riskLevel = this.determineRiskLevel(score);
    
    return {
      score,
      riskLevel,
      issues,
      timestamp: new Date(),
    };
  }
  
  private detectIsolatedNodes(
    graph: NetworkGraph,
    metrics: StructuredMetricsResult
  ): HealthReport['issues'][0] | null {
    const isolated: string[] = [];
    
    for (const node of metrics.nodeMetrics) {
      if (node.degreeCentrality === 0) {
        isolated.push(node.id);
      }
    }
    
    if (isolated.length === 0) return null;
    
    const severity = isolated.length > graph.summary.total_nodes * 0.2 ? 'high' : 
                    isolated.length > graph.summary.total_nodes * 0.1 ? 'medium' : 'low';
    
    return {
      type: 'isolated_nodes',
      severity,
      description: `${isolated.length} nodes have no connections (degree = 0)`,
      affectedNodes: isolated,
      recommendation: 'Encourage isolated members to participate in discussions or remove inactive accounts.',
    };
  }
  
  private detectOverloadRisk(
    graph: NetworkGraph,
    metrics: StructuredMetricsResult
  ): HealthReport['issues'][0] | null {
    const overloaded: string[] = [];
    
    // Find nodes with high message count but low hub score
    const messageCount = new Map<string, number>();
    for (const msg of graph.messages || []) {
      messageCount.set(msg.from_uid, (messageCount.get(msg.from_uid) || 0) + 1);
    }
    
    for (const node of metrics.nodeMetrics) {
      const msgCount = messageCount.get(node.id) || 0;
      const avgMsgCount = graph.summary.total_messages / graph.summary.total_nodes;
      
      // High activity (>2x average) but low hub score (<1.0)
      if (msgCount > avgMsgCount * 2 && node.hubScore < 1.0 && node.hubScore !== Infinity) {
        overloaded.push(node.id);
      }
    }
    
    if (overloaded.length === 0) return null;
    
    return {
      type: 'overload_risk',
      severity: overloaded.length > 3 ? 'high' : overloaded.length > 1 ? 'medium' : 'low',
      description: `${overloaded.length} nodes show overload risk (high activity, low influence)`,
      affectedNodes: overloaded,
      recommendation: 'Review workload distribution. These members may need support or recognition.',
    };
  }
  
  private detectConnoisseurDeficit(
    metrics: StructuredMetricsResult
  ): HealthReport['issues'][0] | null {
    // Count connoisseurs (Layer 3+)
    const connoisseurs = metrics.nodeMetrics.filter(n => n.connoisseurshipLayer >= 3);
    const totalHumans = metrics.nodeMetrics.filter(n => n.type === 'human').length;
    
    const connoisseurRatio = connoisseurs.length / totalHumans;
    
    // Deficit if <10% are connoisseurs
    if (connoisseurRatio >= 0.1) return null;
    
    const severity = connoisseurRatio < 0.05 ? 'high' : 'medium';
    
    return {
      type: 'connoisseur_deficit',
      severity,
      description: `Only ${(connoisseurRatio * 100).toFixed(1)}% of humans are connoisseurs (Layer 3+)`,
      affectedNodes: [],
      recommendation: 'Cultivate more connoisseurs by encouraging quality discussions and peer recognition.',
    };
  }
  
  private detectTeamFragmentation(
    graph: NetworkGraph
  ): HealthReport['issues'][0] | null {
    // Check cross-team edges
    const crossTeamEdges = graph.edges.filter(e => e.is_cross_team).length;
    const totalEdges = graph.edges.length;
    
    if (totalEdges === 0) return null;
    
    const crossTeamRatio = crossTeamEdges / totalEdges;
    
    // Fragmentation if <20% edges are cross-team
    if (crossTeamRatio >= 0.2) return null;
    
    const severity = crossTeamRatio < 0.05 ? 'high' : crossTeamRatio < 0.1 ? 'medium' : 'low';
    
    return {
      type: 'team_fragmentation',
      severity,
      description: `Only ${(crossTeamRatio * 100).toFixed(1)}% of connections are cross-team`,
      affectedNodes: [],
      recommendation: 'Facilitate cross-team collaboration through joint projects or knowledge sharing sessions.',
    };
  }
  
  private calculateHealthScore(issues: HealthReport['issues']): number {
    let score = 100;
    
    for (const issue of issues) {
      const penalty = issue.severity === 'high' ? 25 : issue.severity === 'medium' ? 15 : 5;
      score -= penalty;
    }
    
    return Math.max(0, score);
  }
  
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'low';
    if (score >= 40) return 'medium';
    return 'high';
  }
}
