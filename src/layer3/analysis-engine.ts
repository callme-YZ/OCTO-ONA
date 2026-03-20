/**
 * OCTO-ONA Layer 3: Analysis Engine
 * 
 * Core graph analysis using graphology.
 * Provides intermediate data for Layer 4 metrics.
 */

import Graph from 'graphology';
import { degreeCentrality } from 'graphology-metrics/centrality/degree';
import betweennessCentrality from 'graphology-metrics/centrality/betweenness';
import closenessCentrality from 'graphology-metrics/centrality/closeness';
import { NetworkGraph } from '../layer2/models';

// ============================================
// Type Definitions
// ============================================

export interface CentralityResults {
  degree: Record<string, number>;
  betweenness: Record<string, number>;
  closeness: Record<string, number>;
}

export interface AnalysisCache {
  centrality?: CentralityResults;
  graph?: Graph;
  [key: string]: unknown;
}

// ============================================
// AnalysisEngine Class
// ============================================

export class AnalysisEngine {
  private networkGraph: NetworkGraph;
  private cache: AnalysisCache = {};
  
  constructor(networkGraph: NetworkGraph) {
    this.networkGraph = networkGraph;
  }
  
  /**
   * Convert NetworkGraph to graphology Graph
   * 
   * Lazy initialization - only creates graph when needed.
   * Caches result for performance.
   * 
   * @returns graphology Graph instance
   */
  private getGraph(): Graph {
    if (this.cache.graph) {
      return this.cache.graph;
    }
    
    const graph = new Graph({ type: 'directed' });
    
    // Add nodes
    for (const node of this.networkGraph.human_nodes) {
      graph.addNode(node.id, {
        type: 'human',
        name: node.name,
        team: node.team,
        role: node.role,
      });
    }
    
    for (const node of this.networkGraph.ai_agent_nodes) {
      graph.addNode(node.id, {
        type: 'bot',
        name: node.bot_name,
        creator: node.creator_uid,
      });
    }
    
    // Add edges
    for (const edge of this.networkGraph.edges) {
      graph.addEdge(edge.source, edge.target, {
        weight: edge.weight,
        edge_type: edge.edge_type,
        is_cross_team: edge.is_cross_team,
      });
    }
    
    this.cache.graph = graph;
    console.log(`Graph created: ${graph.order} nodes, ${graph.size} edges`);
    
    return graph;
  }
  
  /**
   * Calculate all centrality metrics
   * 
   * Computes degree, betweenness, and closeness centrality.
   * Results are cached for performance.
   * 
   * @returns CentralityResults object
   */
  async computeCentrality(): Promise<CentralityResults> {
    if (this.cache.centrality) {
      console.log('Using cached centrality results');
      return this.cache.centrality;
    }
    
    const graph = this.getGraph();
    
    console.log('Computing centrality metrics...');
    const startTime = Date.now();
    
    const centrality: CentralityResults = {
      degree: degreeCentrality(graph) as Record<string, number>,
      betweenness: betweennessCentrality(graph) as Record<string, number>,
      closeness: closenessCentrality(graph) as Record<string, number>,
    };
    
    const duration = Date.now() - startTime;
    console.log(`Centrality computed in ${duration}ms`);
    
    this.cache.centrality = centrality;
    return centrality;
  }
  
  /**
   * Get basic graph statistics
   * 
   * @returns Object with node count, edge count, density
   */
  getGraphStats(): {
    nodes: number;
    edges: number;
    density: number;
    avgDegree: number;
  } {
    const graph = this.getGraph();
    
    const nodes = graph.order;
    const edges = graph.size;
    const maxEdges = nodes * (nodes - 1); // Directed graph
    const density = maxEdges > 0 ? edges / maxEdges : 0;
    const avgDegree = nodes > 0 ? (2 * edges) / nodes : 0;
    
    return { nodes, edges, density, avgDegree };
  }
  
  /**
   * Find nodes with highest centrality
   * 
   * @param metric - Centrality metric to sort by
   * @param limit - Number of top nodes to return
   * @returns Array of [nodeId, value] sorted by value descending
   */
  async getTopNodes(
    metric: 'degree' | 'betweenness' | 'closeness',
    limit: number = 10
  ): Promise<Array<[string, number]>> {
    const centrality = await this.computeCentrality();
    const values = centrality[metric];
    
    return Object.entries(values)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }
  
  /**
   * Clear cached results
   * 
   * Use when NetworkGraph changes.
   */
  clearCache(): void {
    this.cache = {};
    console.log('Analysis cache cleared');
  }
}
