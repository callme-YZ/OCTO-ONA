/**
 * Trend Analyzer
 * 
 * Analyzes network evolution trends and predicts future metrics.
 */

import { NetworkGraph } from '../layer2/models';
import { StructuredMetricsResult, getStructuredMetrics, MetricResult } from '../layer4/metrics-calculator';

export interface TrendReport {
  timePoints: Date[];
  trends: {
    metricName: string;
    values: number[];
    prediction?: number;
    slope: number; // Linear regression slope
    r2: number; // Coefficient of determination
    anomalies: {
      index: number;
      value: number;
      expected: number;
      deviation: number;
    }[];
  }[];
  hubScoreTrends: {
    nodeId: string;
    name: string;
    values: number[];
    prediction?: number;
    trend: 'rising' | 'falling' | 'stable';
  }[];
  timestamp: Date;
}

/**
 * TrendAnalyzer
 * 
 * @example
 * ```typescript
 * const analyzer = new TrendAnalyzer();
 * 
 * const report = analyzer.analyzeTrend(
 *   [graph1, graph2, graph3],
 *   [metrics1, metrics2, metrics3],
 *   { predictNext: true }
 * );
 * 
 * console.log(`Predicted density: ${report.trends[0].prediction}`);
 * ```
 */
export class TrendAnalyzer {
  /**
   * Analyze trend across time series
   */
  analyzeTrend(
    graphs: NetworkGraph[],
    metricsResults: MetricResult[][],
    options: { predictNext?: boolean } = {}
  ): TrendReport {
    if (graphs.length < 3) {
      throw new Error('At least 3 time points required for trend analysis');
    }
    
    const structuredMetrics = graphs.map((graph, idx) =>
      getStructuredMetrics(graph, metricsResults[idx])
    );
    
    const timePoints = graphs.map(g => g.start_time);
    
    // Analyze metric trends
    const trends = this.analyzeMetricTrends(structuredMetrics, options.predictNext);
    
    // Analyze hub score trends
    const hubScoreTrends = this.analyzeHubScoreTrends(structuredMetrics, options.predictNext);
    
    return {
      timePoints,
      trends,
      hubScoreTrends,
      timestamp: new Date(),
    };
  }
  
  private analyzeMetricTrends(
    metrics: StructuredMetricsResult[],
    predictNext?: boolean
  ): TrendReport['trends'] {
    const trends: TrendReport['trends'] = [];
    
    // Network density trend
    const densities = metrics.map(m => m.networkMetrics.density);
    trends.push({
      metricName: 'Network Density',
      values: densities,
      ...this.linearRegression(densities, predictNext),
      anomalies: this.detectAnomalies(densities),
    });
    
    // Clustering coefficient trend
    const clustering = metrics.map(m => m.networkMetrics.avgClusteringCoefficient);
    trends.push({
      metricName: 'Avg Clustering Coefficient',
      values: clustering,
      ...this.linearRegression(clustering, predictNext),
      anomalies: this.detectAnomalies(clustering),
    });
    
    // Average hub score trend
    const avgHubScores = metrics.map(m => {
      const scores = m.nodeMetrics.map(n => n.hubScore).filter(s => s !== Infinity);
      return scores.reduce((a, b) => a + b, 0) / scores.length || 0;
    });
    trends.push({
      metricName: 'Avg Hub Score',
      values: avgHubScores,
      ...this.linearRegression(avgHubScores, predictNext),
      anomalies: this.detectAnomalies(avgHubScores),
    });
    
    return trends;
  }
  
  private analyzeHubScoreTrends(
    metrics: StructuredMetricsResult[],
    predictNext?: boolean
  ): TrendReport['hubScoreTrends'] {
    const hubScoreTrends: TrendReport['hubScoreTrends'] = [];
    
    // Collect all node IDs
    const nodeIds = new Set<string>();
    for (const m of metrics) {
      for (const node of m.nodeMetrics) {
        nodeIds.add(node.id);
      }
    }
    
    // Analyze each node's hub score trend
    for (const nodeId of nodeIds) {
      const values: number[] = [];
      let nodeName = nodeId;
      
      for (const m of metrics) {
        const node = m.nodeMetrics.find(n => n.id === nodeId);
        if (node) {
          nodeName = node.name;
          values.push(node.hubScore === Infinity ? 100 : node.hubScore);
        } else {
          values.push(0); // Node doesn't exist in this time point
        }
      }
      
      // Only include nodes with valid data
      if (values.filter(v => v > 0).length >= 2) {
        const regression = this.linearRegression(values, predictNext);
        
        hubScoreTrends.push({
          nodeId,
          name: nodeName,
          values,
          prediction: regression.prediction,
          trend: regression.slope > 0.1 ? 'rising' : regression.slope < -0.1 ? 'falling' : 'stable',
        });
      }
    }
    
    // Sort by absolute slope (biggest changes first)
    hubScoreTrends.sort((a, b) => {
      const slopeA = this.linearRegression(a.values).slope;
      const slopeB = this.linearRegression(b.values).slope;
      return Math.abs(slopeB) - Math.abs(slopeA);
    });
    
    // Return top 20
    return hubScoreTrends.slice(0, 20);
  }
  
  /**
   * Linear regression
   */
  private linearRegression(
    values: number[],
    predictNext?: boolean
  ): { slope: number; r2: number; prediction?: number } {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    // Calculate means
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = values.reduce((a, b) => a + b, 0) / n;
    
    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (values[i] - meanY);
      denominator += (x[i] - meanX) ** 2;
    }
    
    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;
    
    // Calculate R²
    const yPredicted = x.map(xi => slope * xi + intercept);
    const ssRes = values.reduce((sum, yi, i) => sum + (yi - yPredicted[i]) ** 2, 0);
    const ssTot = values.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);
    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
    
    // Predict next value
    const prediction = predictNext ? slope * n + intercept : undefined;
    
    return { slope, r2, prediction };
  }
  
  /**
   * Detect anomalies (values far from trend line)
   */
  private detectAnomalies(values: number[]): TrendReport['trends'][0]['anomalies'] {
    const regression = this.linearRegression(values);
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const anomalies: TrendReport['trends'][0]['anomalies'] = [];
    
    // Calculate standard deviation of residuals
    const yPredicted = x.map(xi => regression.slope * xi + (values.reduce((a, b) => a + b, 0) / n - regression.slope * (n - 1) / 2));
    const residuals = values.map((yi, i) => yi - yPredicted[i]);
    const stdDev = Math.sqrt(residuals.reduce((sum, r) => sum + r ** 2, 0) / n);
    
    // Flag values > 2 standard deviations from expected
    for (let i = 0; i < n; i++) {
      const deviation = Math.abs(residuals[i]);
      if (deviation > 2 * stdDev) {
        anomalies.push({
          index: i,
          value: values[i],
          expected: yPredicted[i],
          deviation: residuals[i],
        });
      }
    }
    
    return anomalies;
  }
}
