/**
 * MetricsEngine Class
 * 
 * Purpose:
 *   Dynamically load and execute metrics from database.
 *   Replaces hardcoded metric definitions.
 * 
 * Supports:
 *   - graphology: Call graphology library functions
 *   - custom: Execute custom TypeScript functions
 *   - sql: Run SQL queries
 *   - javascript: Eval JavaScript expressions
 */

import { LocalDatabase } from './local-database';
import { NetworkGraph } from '../layer2/models';
import { AnalysisEngine } from '../layer3/analysis-engine';

// ============================================
// Types
// ============================================

export interface MetricDefinition {
  id: string;
  category_id: string;
  name_en: string;
  name_zh: string;
  description?: string;
  priority: 'P0' | 'P1' | 'P2';
  unit: string;
  status: 'active' | 'deprecated' | 'experimental';
  version: number;
}

export interface MetricFormula {
  id: number;
  metric_id: string;
  version: number;
  formula_type: 'graphology' | 'custom' | 'sql' | 'javascript';
  formula_code: string;
  parameters: any; // JSON
  is_active: boolean;
  created_by?: string;
}

export interface MetricParameter {
  id: number;
  formula_id: number;
  param_name: string;
  param_type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  default_value: any; // JSON
  min_value?: number;
  max_value?: number;
  description?: string;
}

export interface ComputeOptions {
  parameters?: Record<string, any>; // User-provided parameter overrides
  cacheResult?: boolean; // Whether to cache the result
  sourceId?: string; // Data source ID (for result caching)
  timeRangeStart?: number; // Unix timestamp
  timeRangeEnd?: number; // Unix timestamp
  channelIds?: string[]; // Channel filter
}

export interface MetricResult {
  metric_id: string;
  value: any; // Can be number, object, array (per-node scores, etc.)
  parameters: Record<string, any>; // Actual parameters used
  computed_at: Date;
}

// ============================================
// MetricsEngine Class
// ============================================

export class MetricsEngine {
  private db: LocalDatabase;
  private graph: NetworkGraph;
  private analysisEngine: AnalysisEngine;

  constructor(db: LocalDatabase, graph: NetworkGraph) {
    this.db = db;
    this.graph = graph;
    this.analysisEngine = new AnalysisEngine(graph);
  }

  /**
   * Load metric definition from database
   */
  async loadMetric(metricId: string): Promise<MetricDefinition | null> {
    const [rows]: any = await (this.db as any).pool.query(
      'SELECT * FROM metrics WHERE id = ? AND status = ?',
      [metricId, 'active']
    );

    if (rows.length === 0) return null;
    return rows[0];
  }

  /**
   * Load metric formula from database
   */
  async loadFormula(metricId: string, version?: number): Promise<MetricFormula | null> {
    let query = 'SELECT * FROM metric_formulas WHERE metric_id = ? AND is_active = TRUE';
    const params: any[] = [metricId];

    if (version !== undefined) {
      query += ' AND version = ?';
      params.push(version);
    }

    query += ' ORDER BY version DESC LIMIT 1';

    const [rows]: any = await (this.db as any).pool.query(query, params);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      ...row,
      parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
    };
  }

  /**
   * Load metric parameters from database
   */
  async loadParameters(formulaId: number): Promise<MetricParameter[]> {
    const [rows]: any = await (this.db as any).pool.query(
      'SELECT * FROM metric_parameters WHERE formula_id = ?',
      [formulaId]
    );

    return rows.map((row: any) => ({
      ...row,
      default_value: typeof row.default_value === 'string' ? JSON.parse(row.default_value) : row.default_value,
    }));
  }

  /**
   * Merge user parameters with defaults
   */
  private async mergeParameters(
    formula: MetricFormula,
    userParams?: Record<string, any>
  ): Promise<Record<string, any>> {
    // Start with formula-level parameters
    const merged = { ...formula.parameters };

    // Load parameter definitions
    const paramDefs = await this.loadParameters(formula.id);

    // Apply defaults from parameter definitions
    for (const paramDef of paramDefs) {
      if (!(paramDef.param_name in merged)) {
        merged[paramDef.param_name] = paramDef.default_value;
      }
    }

    // Apply user overrides
    if (userParams) {
      for (const [key, value] of Object.entries(userParams)) {
        // Validate against parameter definition
        const paramDef = paramDefs.find((p) => p.param_name === key);

        if (paramDef) {
          // Type validation
          if (paramDef.param_type === 'number' && typeof value === 'number') {
            // Range validation
            if (paramDef.min_value !== null && paramDef.min_value !== undefined && value < paramDef.min_value) {
              throw new Error(`Parameter ${key} below minimum: ${value} < ${paramDef.min_value}`);
            }
            if (paramDef.max_value !== null && paramDef.max_value !== undefined && value > paramDef.max_value) {
              throw new Error(`Parameter ${key} above maximum: ${value} > ${paramDef.max_value}`);
            }
          }
        }

        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Compute a metric by ID
   */
  async computeMetric(metricId: string, options: ComputeOptions = {}): Promise<MetricResult> {
    // Step 1: Load metric definition
    const metric = await this.loadMetric(metricId);
    if (!metric) {
      throw new Error(`Metric not found: ${metricId}`);
    }

    // Step 2: Load formula
    const formula = await this.loadFormula(metricId);
    if (!formula) {
      throw new Error(`Formula not found for metric: ${metricId}`);
    }

    // Step 3: Merge parameters
    const parameters = await this.mergeParameters(formula, options.parameters);

    // Step 4: Execute formula
    let value: any;

    switch (formula.formula_type) {
      case 'graphology':
        value = await this.executeGraphologyFormula(formula, parameters);
        break;

      case 'custom':
        value = await this.executeCustomFormula(formula, parameters);
        break;

      case 'sql':
        value = await this.executeSqlFormula(formula, parameters);
        break;

      case 'javascript':
        value = await this.executeJavascriptFormula(formula, parameters);
        break;

      default:
        throw new Error(`Unsupported formula type: ${formula.formula_type}`);
    }

    const result: MetricResult = {
      metric_id: metricId,
      value,
      parameters,
      computed_at: new Date(),
    };

    // Step 5: Cache result (if requested)
    if (options.cacheResult && options.sourceId) {
      await this.cacheResult(result, options);
    }

    return result;
  }

  /**
   * Execute graphology formula
   */
  private async executeGraphologyFormula(formula: MetricFormula, parameters: any): Promise<any> {
    // Map formula_code to analysisEngine methods
    const code = formula.formula_code;

    if (code === 'computeCentrality().degree') {
      const centrality = await this.analysisEngine.computeCentrality();
      return centrality.degree;
    } else if (code === 'computeCentrality().betweenness') {
      const centrality = await this.analysisEngine.computeCentrality();
      return centrality.betweenness;
    } else if (code === 'getGraphStats().density') {
      const stats = this.analysisEngine.getGraphStats();
      return stats.density;
    } else {
      throw new Error(`Unknown graphology formula: ${code}`);
    }
  }

  /**
   * Execute custom TypeScript formula
   */
  private async executeCustomFormula(formula: MetricFormula, parameters: any): Promise<any> {
    const code = formula.formula_code;

    // Map custom formulas to analysisEngine methods
    // Some formulas are marked as 'custom' but actually use graphology
    if (code === 'computeCentrality().degree') {
      const centrality = await this.analysisEngine.computeCentrality();
      return centrality.degree;
    } else if (code === 'computeCentrality().betweenness') {
      const centrality = await this.analysisEngine.computeCentrality();
      return centrality.betweenness;
    } else if (code === 'getGraphStats().density') {
      const stats = this.analysisEngine.getGraphStats();
      return stats.density;
    } else if (code === 'BotTagger.tagAllBots()') {
      // Import BotTagger dynamically
      const { BotTagger } = require('../layer4/bot-tagger');
      const tagger = new BotTagger(this.graph, this.analysisEngine);
      const results = await tagger.tagAllBots();

      // Convert to Record<botId, tags[]>
      const tags: Record<string, string[]> = {};
      for (const result of results) {
        tags[result.botId] = result.tags;
      }
      return tags;
    } else if (code === 'edges.filter(H2B/B2H).length / edges.length') {
      const h2bEdges = this.graph.edges.filter((e) => e.edge_type === 'H2B' || e.edge_type === 'B2H');
      const totalEdges = this.graph.edges.length;
      return totalEdges > 0 ? h2bEdges.length / totalEdges : 0;
    } else if (code === 'calculateConnoisseurshipFrequency()') {
      return this.analysisEngine.calculateConnoisseurshipFrequency();
    } else if (code === 'detectConnoisseurshipMessages().recipients.size') {
      const connoisseurshipMsgIds = this.analysisEngine.detectConnoisseurshipMessages();
      const connoisseurshipMsgs = (this.graph.messages || []).filter((m) =>
        connoisseurshipMsgIds.includes(m.id)
      );

      const recipients = new Set<string>();
      for (const msg of connoisseurshipMsgs) {
        for (const uid of msg.to_uids) {
          recipients.add(uid);
        }
      }
      return recipients.size;
    } else if (code === 'connoisseurshipToBot30min()') {
      return this.calculateConnoisseurshipConversion(parameters.window_minutes || 30);
    } else if (code === 'calculateHubScore()') {
      return this.analysisEngine.calculateHubScore();
    } else if (code === 'botMessageCount > P75') {
      return this.calculateHighActivityBots(parameters.percentile || 75);
    } else {
      throw new Error(`Unknown custom formula: ${code}`);
    }
  }

  /**
   * Execute SQL formula
   */
  private async executeSqlFormula(formula: MetricFormula, parameters: any): Promise<any> {
    // Replace placeholders in SQL with parameters
    let sql = formula.formula_code;

    for (const [key, value] of Object.entries(parameters)) {
      sql = sql.replace(new RegExp(`\\$${key}`, 'g'), String(value));
    }

    const [rows]: any = await (this.db as any).pool.query(sql);
    return rows;
  }

  /**
   * Execute JavaScript formula
   */
  private async executeJavascriptFormula(formula: MetricFormula, parameters: any): Promise<any> {
    // Create execution context
    const context = {
      graph: this.graph,
      engine: this.analysisEngine,
      params: parameters,
    };

    // Eval formula (be careful with security!)
    const fn = new Function('context', `with(context) { return ${formula.formula_code}; }`);
    return fn(context);
  }

  /**
   * Cache result to database
   */
  private async cacheResult(result: MetricResult, options: ComputeOptions): Promise<void> {
    if (!options.sourceId) return;

    await (this.db as any).pool.query(
      `INSERT INTO analysis_results 
       (source_id, metric_id, formula_version, time_range_start, time_range_end, channel_ids, result, parameters)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        options.sourceId,
        result.metric_id,
        1, // TODO: get formula version
        options.timeRangeStart || null,
        options.timeRangeEnd || null,
        options.channelIds ? JSON.stringify(options.channelIds) : null,
        JSON.stringify(result.value),
        JSON.stringify(result.parameters),
      ]
    );
  }

  // ============================================
  // Helper Methods for Custom Formulas
  // ============================================

  private calculateConnoisseurshipConversion(windowMinutes: number): Record<string, number> {
    if (!this.graph.messages) return {};

    const connoisseurshipMsgIds = this.analysisEngine.detectConnoisseurshipMessages();
    const connoisseurshipMsgs = this.graph.messages.filter((m) => connoisseurshipMsgIds.includes(m.id));

    const botIds = new Set(this.graph.ai_agent_nodes.map((b) => b.id));

    const conversions: Record<string, number> = {};

    // Group by user
    const msgsByUser = new Map<string, typeof connoisseurshipMsgs>();
    for (const msg of connoisseurshipMsgs) {
      if (!msgsByUser.has(msg.from_uid)) {
        msgsByUser.set(msg.from_uid, []);
      }
      msgsByUser.get(msg.from_uid)!.push(msg);
    }

    // Calculate conversion per user
    for (const [userId, userMsgs] of msgsByUser.entries()) {
      let executedCount = 0;

      for (const cMsg of userMsgs) {
        const windowEnd = new Date(cMsg.timestamp.getTime() + windowMinutes * 60 * 1000);

        const botResponded = this.graph.messages.some((msg) => {
          return (
            botIds.has(msg.from_uid) &&
            msg.timestamp > cMsg.timestamp &&
            msg.timestamp <= windowEnd &&
            msg.to_uids.includes(userId)
          );
        });

        if (botResponded) {
          executedCount++;
        }
      }

      conversions[userId] = userMsgs.length > 0 ? executedCount / userMsgs.length : 0.0;
    }

    return conversions;
  }

  private calculateHighActivityBots(percentile: number): Record<string, boolean> {
    if (!this.graph.messages) return {};

    const botMessageCounts: Record<string, number> = {};
    for (const msg of this.graph.messages) {
      const isBot = this.graph.ai_agent_nodes.some((b) => b.id === msg.from_uid);
      if (isBot) {
        botMessageCounts[msg.from_uid] = (botMessageCounts[msg.from_uid] || 0) + 1;
      }
    }

    const counts = Object.values(botMessageCounts);
    if (counts.length === 0) return {};

    counts.sort((a, b) => a - b);
    const pIndex = Math.floor((counts.length * percentile) / 100);
    const threshold = counts[pIndex];

    const tags: Record<string, boolean> = {};
    for (const [botId, count] of Object.entries(botMessageCounts)) {
      tags[botId] = count > threshold;
    }

    return tags;
  }
}
