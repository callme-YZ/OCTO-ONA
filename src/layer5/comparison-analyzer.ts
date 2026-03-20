/**
 * Comparison Analyzer
 * 
 * Compares multiple NetworkGraphs across different dimensions.
 */

import { NetworkGraph } from '../layer2/models';
import { StructuredMetricsResult, getStructuredMetrics, MetricResult } from '../layer4/metrics-calculator';

export interface ComparisonReport {
  dimension: 'time' | 'team' | 'theme' | 'bot_version';
  graphs: {
    id: string;
    label: string;
    metrics: StructuredMetricsResult;
  }[];
  changes: {
    metricName: string;
    values: number[];
    changeRate: number; // Percentage change (last vs first)
    trend: 'up' | 'down' | 'stable';
  }[];
  nodeChanges: {
    added: string[];
    removed: string[];
    hubScoreChanges: {
      nodeId: string;
      name: string;
      before: number;
      after: number;
      change: number;
    }[];
  };
  timestamp: Date;
}

/**
 * ComparisonAnalyzer
 * 
 * @example
 * ```typescript
 * const analyzer = new ComparisonAnalyzer();
 * 
 * const report = analyzer.compare(
 *   [graph1, graph2],
 *   [metrics1, metrics2],
 *   { dimension: 'time', labels: ['Week 1', 'Week 2'] }
 * );
 * 
 * console.log(`Hub Score change: ${report.changes[0].changeRate}%`);
 * ```
 */
export class ComparisonAnalyzer {
  /**
   * Compare multiple graphs
   */
  compare(
    graphs: NetworkGraph[],
    metricsResults: MetricResult[][],
    options: {
      dimension: 'time' | 'team' | 'theme' | 'bot_version';
      labels?: string[];
    }
  ): ComparisonReport {
    if (graphs.length < 2) {
      throw new Error('At least 2 graphs required for comparison');
    }
    
    // Convert to structured metrics
    const structuredMetrics = graphs.map((graph, idx) =>
      getStructuredMetrics(graph, metricsResults[idx])
    );
    
    // Build comparison data
    const graphsData = graphs.map((graph, idx) => ({
      id: graph.graph_id,
      label: options.labels?.[idx] || `Graph ${idx + 1}`,
      metrics: structuredMetrics[idx],
    }));
    
    // Analyze metric changes
    const changes = this.analyzeMetricChanges(structuredMetrics);
    
    // Analyze node changes
    const nodeChanges = this.analyzeNodeChanges(graphs, structuredMetrics);
    
    return {
      dimension: options.dimension,
      graphs: graphsData,
      changes,
      nodeChanges,
      timestamp: new Date(),
    };
  }
  
  private analyzeMetricChanges(metrics: StructuredMetricsResult[]): ComparisonReport['changes'] {
    const changes: ComparisonReport['changes'] = [];
    
    // Network density
    const densities = metrics.map(m => m.networkMetrics.density);
    changes.push({
      metricName: 'Network Density',
      values: densities,
      changeRate: this.calculateChangeRate(densities[0], densities[densities.length - 1]),
      trend: this.determineTrend(densities[0], densities[densities.length - 1]),
    });
    
    // Average clustering coefficient
    const clustering = metrics.map(m => m.networkMetrics.avgClusteringCoefficient);
    changes.push({
      metricName: 'Avg Clustering Coefficient',
      values: clustering,
      changeRate: this.calculateChangeRate(clustering[0], clustering[clustering.length - 1]),
      trend: this.determineTrend(clustering[0], clustering[clustering.length - 1]),
    });
    
    // Average hub score
    const avgHubScores = metrics.map(m => {
      const scores = m.nodeMetrics.map(n => n.hubScore).filter(s => s !== Infinity);
      return scores.reduce((a, b) => a + b, 0) / scores.length || 0;
    });
    changes.push({
      metricName: 'Avg Hub Score',
      values: avgHubScores,
      changeRate: this.calculateChangeRate(avgHubScores[0], avgHubScores[avgHubScores.length - 1]),
      trend: this.determineTrend(avgHubScores[0], avgHubScores[avgHubScores.length - 1]),
    });
    
    return changes;
  }
  
  private analyzeNodeChanges(
    graphs: NetworkGraph[],
    metrics: StructuredMetricsResult[]
  ): ComparisonReport['nodeChanges'] {
    const firstGraph = graphs[0];
    const lastGraph = graphs[graphs.length - 1];
    
    const firstNodes = new Set([
      ...firstGraph.human_nodes.map(h => h.id),
      ...firstGraph.ai_agent_nodes.map(b => b.id),
    ]);
    
    const lastNodes = new Set([
      ...lastGraph.human_nodes.map(h => h.id),
      ...lastGraph.ai_agent_nodes.map(b => b.id),
    ]);
    
    // Find added/removed nodes
    const added: string[] = [];
    const removed: string[] = [];
    
    for (const nodeId of lastNodes) {
      if (!firstNodes.has(nodeId)) added.push(nodeId);
    }
    
    for (const nodeId of firstNodes) {
      if (!lastNodes.has(nodeId)) removed.push(nodeId);
    }
    
    // Hub score changes (for nodes that exist in both)
    const hubScoreChanges: ComparisonReport['nodeChanges']['hubScoreChanges'] = [];
    
    const firstMetrics = metrics[0];
    const lastMetrics = metrics[metrics.length - 1];
    
    for (const nodeId of firstNodes) {
      if (lastNodes.has(nodeId)) {
        const beforeNode = firstMetrics.nodeMetrics.find(n => n.id === nodeId);
        const afterNode = lastMetrics.nodeMetrics.find(n => n.id === nodeId);
        
        if (beforeNode && afterNode && beforeNode.hubScore !== Infinity && afterNode.hubScore !== Infinity) {
          const change = afterNode.hubScore - beforeNode.hubScore;
          if (Math.abs(change) > 0.1) { // Only significant changes
            hubScoreChanges.push({
              nodeId,
              name: afterNode.name,
              before: beforeNode.hubScore,
              after: afterNode.hubScore,
              change,
            });
          }
        }
      }
    }
    
    // Sort by absolute change
    hubScoreChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    
    return { added, removed, hubScoreChanges };
  }
  
  private calculateChangeRate(before: number, after: number): number {
    if (before === 0) return after === 0 ? 0 : 100;
    return ((after - before) / before) * 100;
  }
  
  private determineTrend(before: number, after: number): 'up' | 'down' | 'stable' {
    const change = after - before;
    if (Math.abs(change) < 0.01) return 'stable';
    return change > 0 ? 'up' : 'down';
  }
}
