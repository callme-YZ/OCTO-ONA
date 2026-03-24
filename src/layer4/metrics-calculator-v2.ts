/**
 * OCTO-ONA Layer 4: Metrics Calculator v2.0
 * 
 * Refactored to use MetricsEngine for database-driven metrics.
 * Maintains backward compatibility with v1 API.
 */

import { NetworkGraph } from '../layer2/models';
import { AnalysisEngine } from '../layer3/analysis-engine';
import { MetricsEngine, MetricResult as EngineResult } from '../database/metrics-engine';
import { LocalDatabase } from '../database/local-database';

// ============================================
// Type Definitions (v1 compatibility)
// ============================================

export type MetricValue = number | string | boolean | string[] | Record<string, unknown>;

export interface MetricResult {
  metricId: string;
  name: string;
  category: 'network' | 'collaboration' | 'connoisseurship' | 'bot_tag';
  value: MetricValue;
  unit?: string;
  description?: string;
  timestamp: Date;
}

export type MetricCalculator = (
  graph: NetworkGraph,
  engine: AnalysisEngine
) => MetricValue | Promise<MetricValue>;

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
// MetricsCalculator v2
// ============================================

export class MetricsCalculator {
  private networkGraph: NetworkGraph;
  private engine: AnalysisEngine;
  private metricsEngine?: MetricsEngine;
  
  // Legacy support: in-memory metric registry
  private legacyMetrics: Map<string, MetricDefinition> = new Map();
  
  constructor(
    networkGraph: NetworkGraph,
    database?: LocalDatabase
  ) {
    this.networkGraph = networkGraph;
    this.engine = new AnalysisEngine(networkGraph);
    
    if (database) {
      this.metricsEngine = new MetricsEngine(database, networkGraph);
    }
  }
  
  // ============================================
  // v1 API (backward compatibility)
  // ============================================
  
  /**
   * Register a metric (legacy v1 API)
   */
  registerMetric(definition: MetricDefinition): void {
    this.legacyMetrics.set(definition.id, definition);
    console.log(`[Legacy] Registered metric: ${definition.id} (${definition.priority})`);
  }
  
  /**
   * Register multiple metrics (legacy v1 API)
   */
  registerMetrics(definitions: MetricDefinition[]): void {
    for (const def of definitions) {
      this.registerMetric(def);
    }
  }
  
  /**
   * Calculate a single metric (v1 API, auto-routes to v2 if DB available)
   */
  async calculateMetric(metricId: string, parameters?: Record<string, any>): Promise<MetricResult> {
    // Try v2 (database-driven) first
    if (this.metricsEngine) {
      try {
        const engineResult = await this.metricsEngine.computeMetric(metricId, { parameters });
        return await this.convertEngineResult(engineResult);
      } catch (error) {
        console.warn(`[v2] Metric ${metricId} not found in DB, falling back to legacy:`, (error as Error).message);
      }
    }
    
    // Fall back to v1 (in-memory registry)
    const definition = this.legacyMetrics.get(metricId);
    if (!definition) {
      throw new Error(`Metric not found: ${metricId}`);
    }
    
    const value = await definition.calculator(this.networkGraph, this.engine);
    
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
   * Calculate multiple metrics (v1 API)
   */
  async calculateMetrics(metricIds: string[]): Promise<MetricResult[]> {
    const results: MetricResult[] = [];
    
    for (const metricId of metricIds) {
      try {
        const result = await this.calculateMetric(metricId);
        results.push(result);
      } catch (error) {
        console.error(`Failed to calculate metric ${metricId}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Calculate all metrics by priority (v1 API)
   */
  async calculateByPriority(priority: 'P0' | 'P1' | 'P2'): Promise<MetricResult[]> {
    // Try v2 first
    if (this.metricsEngine) {
      return this.calculateByPriorityV2(priority);
    }
    
    // Fall back to v1
    const metricIds = Array.from(this.legacyMetrics.values())
      .filter(def => def.priority === priority)
      .map(def => def.id);
    
    return this.calculateMetrics(metricIds);
  }
  
  /**
   * Calculate all registered metrics (v1 API)
   */
  async calculateAll(): Promise<MetricResult[]> {
    // Try v2 first
    if (this.metricsEngine) {
      return this.calculateAllV2();
    }
    
    // Fall back to v1
    const metricIds = Array.from(this.legacyMetrics.keys());
    return this.calculateMetrics(metricIds);
  }
  
  /**
   * List all registered metrics (v1 API)
   */
  listMetrics(): MetricDefinition[] {
    return Array.from(this.legacyMetrics.values());
  }
  
  /**
   * Get metrics by priority (v1 API)
   */
  getMetricsByPriority(priority: 'P0' | 'P1' | 'P2'): MetricDefinition[] {
    return this.listMetrics().filter(def => def.priority === priority);
  }
  
  /**
   * Get metrics by category (v1 API)
   */
  getMetricsByCategory(category: string): MetricDefinition[] {
    return this.listMetrics().filter(def => def.category === category);
  }
  
  // ============================================
  // v2 API (database-driven)
  // ============================================
  
  /**
   * Calculate all metrics by priority (v2, database-driven)
   */
  private async calculateByPriorityV2(priority: 'P0' | 'P1' | 'P2'): Promise<MetricResult[]> {
    if (!this.metricsEngine) {
      throw new Error('MetricsEngine not initialized');
    }
    
    // Query database for metrics with this priority
    const db = (this.metricsEngine as any).db;
    const [rows]: any = await (db as any).pool.query(
      'SELECT id FROM metrics WHERE priority = ? AND status = ?',
      [priority, 'active']
    );
    
    const metricIds = rows.map((row: any) => row.id);
    
    const results: MetricResult[] = [];
    for (const metricId of metricIds) {
      try {
        const engineResult = await this.metricsEngine.computeMetric(metricId);
        const result = await this.convertEngineResult(engineResult); results.push(result);
      } catch (error) {
        console.error(`Failed to calculate metric ${metricId}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Calculate all active metrics (v2, database-driven)
   */
  private async calculateAllV2(): Promise<MetricResult[]> {
    if (!this.metricsEngine) {
      throw new Error('MetricsEngine not initialized');
    }
    
    // Query database for all active metrics
    const db = (this.metricsEngine as any).db;
    const [rows]: any = await (db as any).pool.query(
      'SELECT id FROM metrics WHERE status = ?',
      ['active']
    );
    
    const metricIds = rows.map((row: any) => row.id);
    
    const results: MetricResult[] = [];
    for (const metricId of metricIds) {
      try {
        const engineResult = await this.metricsEngine.computeMetric(metricId);
        const result = await this.convertEngineResult(engineResult); results.push(result);
      } catch (error) {
        console.error(`Failed to calculate metric ${metricId}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Convert MetricsEngine result to v1 format
   */
  private async convertEngineResult(engineResult: EngineResult): Promise<MetricResult> {
    if (!this.metricsEngine) {
      throw new Error('MetricsEngine not initialized');
    }
    
    // Load metric definition from database
    const metricDef = await this.metricsEngine.loadMetric(engineResult.metric_id);
    
    if (!metricDef) {
      throw new Error(`Metric definition not found: ${engineResult.metric_id}`);
    }
    
    return {
      metricId: engineResult.metric_id,
      name: metricDef.name_en,
      category: metricDef.category_id as any,
      value: engineResult.value,
      unit: metricDef.unit,
      description: metricDef.description,
      timestamp: engineResult.computed_at,
    };
  }
  
  // ============================================
  // Utility Methods
  // ============================================
  
  /**
   * Get the underlying AnalysisEngine
   */
  getAnalysisEngine(): AnalysisEngine {
    return this.engine;
  }
  
  /**
   * Get the underlying MetricsEngine (v2 only)
   */
  getMetricsEngine(): MetricsEngine | undefined {
    return this.metricsEngine;
  }
}
