/**
 * OCTO-ONA Dashboard Generator
 * 
 * Generates HTML dashboard from NetworkGraph and metrics.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';
import { NetworkGraph } from '../layer2/models';
import { AnalysisEngine } from '../layer3/analysis-engine';
import { MetricsCalculator } from '../layer4/metrics-calculator';
import { ALL_CORE_METRICS } from '../layer4/core-metrics';

// ============================================
// Type Definitions
// ============================================

export interface DashboardData {
  // Metadata
  graphId: string;
  startTime: string;
  endTime: string;
  timestamp: string;
  
  // KPIs
  totalNodes: number;
  totalHumans: number;
  totalBots: number;
  totalMessages: number;
  networkDensity: string;
  
  // Chart Data
  hubScoreData: {
    names: string[];
    values: number[];
    layers: string[];
  };
  
  botTagsData: Array<{
    name: string;
    value: number;
  }>;
  
  networkData: {
    nodes: Array<{
      id: string;
      name: string;
      category: number;
      value?: number;
    }>;
    links: Array<{
      source: string;
      target: string;
      value?: number;
    }>;
    categories: Array<{
      name: string;
    }>;
  };
  
  timelineData: {
    dates: string[];
    counts: number[];
  };
  
  topInteractions: Array<{
    from: string;
    to: string;
    count: number;
  }>;
}

// ============================================
// DashboardGenerator Class
// ============================================

export class DashboardGenerator {
  private graph: NetworkGraph;
  private engine: AnalysisEngine;
  private calculator: MetricsCalculator;
  
  constructor(graph: NetworkGraph) {
    this.graph = graph;
    this.engine = new AnalysisEngine(graph);
    this.calculator = new MetricsCalculator(graph);
    this.calculator.registerMetrics(ALL_CORE_METRICS);
  }
  
  /**
   * Generate dashboard HTML (inline data mode)
   * 
   * @param outputPath - Path to save HTML file
   */
  async generate(outputPath: string): Promise<void> {
    console.log('Generating dashboard...');
    
    // Prepare data
    const data = await this.prepareDashboardData();
    
    // Load template
    const templatePath = path.join(__dirname, 'dashboard-template.html');
    const template = fs.readFileSync(templatePath, 'utf-8');
    
    // Render template
    const html = ejs.render(template, data);
    
    // Write output
    fs.writeFileSync(outputPath, html, 'utf-8');
    
    console.log(`Dashboard generated: ${outputPath}`);
    console.log(`File size: ${(html.length / 1024).toFixed(2)} KB`);
  }
  
  /**
   * Generate dashboard with external data loading
   * 
   * @param outputDir - Directory to save index.html and data.json
   */
  async generateWithExternalData(outputDir: string): Promise<void> {
    console.log('Generating dashboard with external data...');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Prepare data
    const data = await this.prepareDashboardData();
    
    // Write data.json
    const dataPath = path.join(outputDir, 'data.json');
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    
    // Load external template
    const templatePath = path.join(__dirname, 'dashboard-template-external.html');
    const html = fs.readFileSync(templatePath, 'utf-8');
    
    // Write index.html
    const htmlPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(htmlPath, html, 'utf-8');
    
    console.log(`Dashboard generated: ${outputDir}`);
    console.log(`  - index.html: ${(html.length / 1024).toFixed(2)} KB`);
    console.log(`  - data.json: ${(JSON.stringify(data).length / 1024).toFixed(2)} KB`);
    console.log('\n✅ Open index.html in your browser to view the dashboard.');
  }
  
  /**
   * Prepare dashboard data
   */
  private async prepareDashboardData(): Promise<DashboardData> {
    // Calculate metrics
    const results = await this.calculator.calculateAll('P0');
    
    // Extract metrics
    const hubScoreMetric = results.find(r => r.metricId === 'L3.5');
    const networkDensityMetric = results.find(r => r.metricId === 'L1.4');
    const botTagsMetric = results.find(r => r.metricId === 'L2.1');
    
    // Prepare data
    return {
      // Metadata
      graphId: this.graph.graph_id,
      startTime: this.graph.start_time.toISOString().split('T')[0],
      endTime: this.graph.end_time.toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      
      // KPIs
      totalNodes: this.graph.summary.total_nodes,
      totalHumans: this.graph.summary.total_humans,
      totalBots: this.graph.summary.total_bots,
      totalMessages: this.graph.summary.total_messages,
      networkDensity: (networkDensityMetric?.value as number || 0).toFixed(3),
      
      // Charts
      hubScoreData: this.prepareHubScoreData(hubScoreMetric),
      botTagsData: this.prepareBotTagsData(botTagsMetric),
      networkData: this.prepareNetworkData(),
      timelineData: this.prepareTimelineData(),
      topInteractions: this.prepareTopInteractions(),
    };
  }
  
  private prepareHubScoreData(metric: any): DashboardData['hubScoreData'] {
    if (!metric || typeof metric.value !== 'object') {
      return { names: [], values: [], layers: [] };
    }
    
    const hubScores = metric.value as Record<string, number>;
    const layers = this.engine.classifyConnoisseurLayer;
    
    // Sort by Hub Score descending
    const sorted = Object.entries(hubScores).sort((a, b) => {
      if (a[1] === Infinity && b[1] === Infinity) return 0;
      if (a[1] === Infinity) return -1;
      if (b[1] === Infinity) return 1;
      return b[1] - a[1];
    }).slice(0, 10); // Top 10
    
    return {
      names: sorted.map(([id]) => this.getNodeName(id)),
      values: sorted.map(([, score]) => score === Infinity ? 9999 : score),
      layers: sorted.map(([, score]) => layers.call(this.engine, score)),
    };
  }
  
  private prepareBotTagsData(metric: any): DashboardData['botTagsData'] {
    if (!metric || typeof metric.value !== 'object') {
      return [];
    }
    
    const tags = metric.value as Record<string, string[]>;
    const tagCounts: Record<string, number> = {};
    
    for (const botTags of Object.values(tags)) {
      for (const tag of botTags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    
    return Object.entries(tagCounts).map(([name, value]) => ({ name, value }));
  }
  
  private prepareNetworkData(): DashboardData['networkData'] {
    const nodes = [];
    const categories = [
      { name: 'Human' },
      { name: 'AI Agent' },
    ];
    
    // Add human nodes
    for (const human of this.graph.human_nodes) {
      nodes.push({
        id: human.id,
        name: human.name || human.id,
        category: 0,
        value: this.graph.edges.filter(e => 
          e.source === human.id || e.target === human.id
        ).length,
      });
    }
    
    // Add bot nodes
    for (const bot of this.graph.ai_agent_nodes) {
      nodes.push({
        id: bot.id,
        name: bot.bot_name,
        category: 1,
        value: this.graph.edges.filter(e => 
          e.source === bot.id || e.target === bot.id
        ).length,
      });
    }
    
    // Add links
    const links = this.graph.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      value: edge.weight,
    }));
    
    return { nodes, links, categories };
  }
  
  private prepareTimelineData(): DashboardData['timelineData'] {
    if (!this.graph.messages) {
      return { dates: [], counts: [] };
    }
    
    // Group messages by date
    const dateCounts = new Map<string, number>();
    
    for (const msg of this.graph.messages) {
      const date = msg.timestamp.toISOString().split('T')[0];
      dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
    }
    
    // Sort by date
    const sorted = Array.from(dateCounts.entries()).sort((a, b) => 
      a[0].localeCompare(b[0])
    );
    
    return {
      dates: sorted.map(([date]) => date),
      counts: sorted.map(([, count]) => count),
    };
  }
  
  private prepareTopInteractions(): DashboardData['topInteractions'] {
    // Count interactions per edge
    const edgeCounts = new Map<string, { from: string; to: string; count: number }>();
    
    for (const edge of this.graph.edges) {
      const key = `${edge.source}->${edge.target}`;
      const existing = edgeCounts.get(key);
      
      if (existing) {
        existing.count += edge.message_ids.length;
      } else {
        edgeCounts.set(key, {
          from: this.getNodeName(edge.source),
          to: this.getNodeName(edge.target),
          count: edge.message_ids.length,
        });
      }
    }
    
    // Sort by count descending
    return Array.from(edgeCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
  
  private getNodeName(id: string): string {
    const human = this.graph.human_nodes.find(h => h.id === id);
    if (human) return human.name || id;
    
    const bot = this.graph.ai_agent_nodes.find(b => b.id === id);
    if (bot) return bot.bot_name;
    
    return id;
  }
}
