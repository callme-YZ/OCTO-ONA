/**
 * OCTO-ONA Layer 4: Metrics Calculator
 * 
 * Centralized metrics calculation and registration system.
 */

import { NetworkGraph } from '../layer2/models';
import { AnalysisEngine } from '../layer3/analysis-engine';

// ============================================
// Type Definitions
// ============================================

/**
 * Metric value types
 */
export type MetricValue = number | string | boolean | string[] | Record<string, unknown>;

/**
 * Metric result with metadata
 */
export interface MetricResult {
  metricId: string;
  name: string;
  category: 'network' | 'collaboration' | 'connoisseurship' | 'bot_tag';
  value: MetricValue;
  unit?: string;
  description?: string;
  timestamp: Date;
}

/**
 * Metric calculator function signature
 */
export type MetricCalculator = (
  graph: NetworkGraph,
  engine: AnalysisEngine
) => MetricValue | Promise<MetricValue>;

/**
 * Metric definition
 */
export interface MetricDefinition {
  id: string;
  name: string;
  category: 'network' | 'collaboration' | 'connoisseurship' | 'bot_tag';
  priority: 'P0' | 'P1' | 'P2';
  calculator: MetricCalculator;
  unit?: string;
  description?: string;
}

// ============================================
// MetricsCalculator Class
// ============================================

export class MetricsCalculator {
  private networkGraph: NetworkGraph;
  private engine: AnalysisEngine;
  private metrics: Map<string, MetricDefinition> = new Map();
  
  constructor(networkGraph: NetworkGraph) {
    this.networkGraph = networkGraph;
    this.engine = new AnalysisEngine(networkGraph);
  }
  
  /**
   * Register a metric
   * 
   * @param definition - Metric definition
   */
  registerMetric(definition: MetricDefinition): void {
    this.metrics.set(definition.id, definition);
    console.log(`Registered metric: ${definition.id} (${definition.priority})`);
  }
  
  /**
   * Register multiple metrics
   * 
   * @param definitions - Array of metric definitions
   */
  registerMetrics(definitions: MetricDefinition[]): void {
    for (const def of definitions) {
      this.registerMetric(def);
    }
  }
  
  /**
   * Calculate a single metric
   * 
   * @param metricId - Metric ID to calculate
   * @returns MetricResult
   */
  async calculateMetric(metricId: string): Promise<MetricResult> {
    const definition = this.metrics.get(metricId);
    
    if (!definition) {
      throw new Error(`Metric not found: ${metricId}`);
    }
    
    const value = await Promise.resolve(
      definition.calculator(this.networkGraph, this.engine)
    );
    
    return {
      metricId: definition.id,
      name: definition.name,
      category: definition.category,
      value,
      unit: definition.unit,
      description: definition.description,
      timestamp: new Date(),
    };
  }
  
  /**
   * Calculate all registered metrics
   * 
   * @param priority - Filter by priority (optional)
   * @returns Array of MetricResult
   */
  async calculateAll(priority?: 'P0' | 'P1' | 'P2'): Promise<MetricResult[]> {
    const metricsToCalculate = Array.from(this.metrics.values()).filter(
      metric => !priority || metric.priority === priority
    );
    
    console.log(`Calculating ${metricsToCalculate.length} metrics...`);
    
    const results = [];
    for (const metric of metricsToCalculate) {
      try {
        const result = await this.calculateMetric(metric.id);
        results.push(result);
      } catch (error) {
        console.error(`Failed to calculate ${metric.id}:`, error);
      }
    }
    
    console.log(`Calculated ${results.length}/${metricsToCalculate.length} metrics successfully`);
    
    return results;
  }
  
  /**
   * Calculate metrics by category
   * 
   * @param category - Metric category
   * @returns Array of MetricResult
   */
  async calculateByCategory(
    category: 'network' | 'collaboration' | 'connoisseurship' | 'bot_tag'
  ): Promise<MetricResult[]> {
    const metricsToCalculate = Array.from(this.metrics.values()).filter(
      metric => metric.category === category
    );
    
    const results = [];
    for (const metric of metricsToCalculate) {
      try {
        const result = await this.calculateMetric(metric.id);
        results.push(result);
      } catch (error) {
        console.error(`Failed to calculate ${metric.id}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Get list of registered metrics
   * 
   * @returns Array of metric IDs and names
   */
  listMetrics(): Array<{ id: string; name: string; category: string; priority: string }> {
    return Array.from(this.metrics.values()).map(metric => ({
      id: metric.id,
      name: metric.name,
      category: metric.category,
      priority: metric.priority,
    }));
  }
  
  /**
   * Export results to JSON
   * 
   * @param results - Metric results
   * @returns JSON string
   */
  exportToJSON(results: MetricResult[]): string {
    const output = {
      metadata: {
        graphId: this.networkGraph.graph_id,
        timestamp: new Date().toISOString(),
        metricCount: results.length,
      },
      metrics: results.reduce((acc, result) => {
        acc[result.metricId] = {
          name: result.name,
          category: result.category,
          value: result.value,
          unit: result.unit,
        };
        return acc;
      }, {} as Record<string, unknown>),
    };
    
    return JSON.stringify(output, null, 2);
  }
}

// ============================================
// Structured Results Interface
// ============================================

/**
 * Node-level metrics
 */
export interface NodeMetrics {
  id: string;
  name: string;
  type: 'human' | 'bot';
  hubScore: number;
  connoisseurshipLayer: number;
  degreeCentrality: number;
  betweennessCentrality: number;
  eigenvectorCentrality: number;
  clusteringCoefficient: number;
  community?: number;
}

/**
 * Network-level metrics
 */
export interface NetworkMetrics {
  density: number;
  avgClusteringCoefficient: number;
  modularity: number;
  communities: number[];
  avgPathLength?: number;
}

/**
 * Bot-specific metrics
 */
export interface BotMetrics {
  id: string;
  name: string;
  functionalTags: string[];
  hubScore: number;
  responseTime?: number;
}

/**
 * Structured metrics result
 */
export interface StructuredMetricsResult {
  nodeMetrics: NodeMetrics[];
  networkMetrics: NetworkMetrics;
  botMetrics: BotMetrics[];
  timestamp: Date;
}

/**
 * Get structured metrics result
 * 
 * Organizes MetricResult[] into a structured object for easy consumption by exporters.
 * 
 * @param results - Array of MetricResult from calculateAll()
 * @returns Structured metrics organized by category
 */
export function getStructuredMetrics(
  graph: NetworkGraph,
  results: MetricResult[]
): StructuredMetricsResult {
  const nodeMetrics: NodeMetrics[] = [];
  const networkMetrics: Partial<NetworkMetrics> = {};
  const botMetrics: BotMetrics[] = [];
  
  // Extract metric values by ID
  const metricMap = new Map<string, MetricValue>();
  for (const result of results) {
    metricMap.set(result.metricId, result.value);
  }
  
  // Build node metrics
  const hubScoreMap = metricMap.get('L3.1_hub_score') as Record<string, number> || {};
  const connoisseurshipMap = metricMap.get('L3.2_connoisseurship_layer') as Record<string, number> || {};
  const degreeMap = metricMap.get('L1.1_degree_centrality') as Record<string, number> || {};
  const betweennessMap = metricMap.get('L1.2_betweenness_centrality') as Record<string, number> || {};
  const eigenvectorMap = metricMap.get('L1.3_eigenvector_centrality') as Record<string, number> || {};
  const clusteringMap = metricMap.get('L1.7_clustering_coefficient') as Record<string, number> || {};
  
  // Human nodes
  for (const human of graph.human_nodes) {
    nodeMetrics.push({
      id: human.id,
      name: human.name,
      type: 'human',
      hubScore: hubScoreMap[human.id] ?? 0,
      connoisseurshipLayer: connoisseurshipMap[human.id] ?? 0,
      degreeCentrality: degreeMap[human.id] ?? 0,
      betweennessCentrality: betweennessMap[human.id] ?? 0,
      eigenvectorCentrality: eigenvectorMap[human.id] ?? 0,
      clusteringCoefficient: clusteringMap[human.id] ?? 0,
    });
  }
  
  // Bot nodes
  const botTagsMap = metricMap.get('T_all_bot_tags') as Record<string, string[]> || {};
  
  for (const bot of graph.ai_agent_nodes) {
    nodeMetrics.push({
      id: bot.id,
      name: bot.bot_name,
      type: 'bot',
      hubScore: hubScoreMap[bot.id] ?? 0,
      connoisseurshipLayer: connoisseurshipMap[bot.id] ?? 0,
      degreeCentrality: degreeMap[bot.id] ?? 0,
      betweennessCentrality: betweennessMap[bot.id] ?? 0,
      eigenvectorCentrality: eigenvectorMap[bot.id] ?? 0,
      clusteringCoefficient: clusteringMap[bot.id] ?? 0,
    });
    
    botMetrics.push({
      id: bot.id,
      name: bot.bot_name,
      functionalTags: botTagsMap[bot.id] || bot.functional_tags || [],
      hubScore: hubScoreMap[bot.id] ?? 0,
    });
  }
  
  // Build network metrics
  networkMetrics.density = metricMap.get('L1.4_network_density') as number ?? 0;
  networkMetrics.avgClusteringCoefficient = metricMap.get('L1.5_avg_clustering') as number ?? 0;
  networkMetrics.modularity = metricMap.get('L1.6_modularity') as number ?? 0;
  networkMetrics.communities = (metricMap.get('L1.6_modularity') as unknown as number[]) ?? [];
  
  return {
    nodeMetrics,
    networkMetrics: networkMetrics as NetworkMetrics,
    botMetrics,
    timestamp: new Date(),
  };
}
