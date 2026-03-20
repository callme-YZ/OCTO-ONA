/**
 * API Server
 * 
 * RESTful API for programmatic access to ONA data.
 */

import express, { Express, Request, Response } from 'express';
import { NetworkGraph } from '../layer2/models';
import { StructuredMetricsResult } from '../layer4/metrics-calculator';

export interface APIServerOptions {
  port?: number;
  cors?: boolean;
}

export class APIServer {
  private app: Express;
  private graphStore: Map<string, NetworkGraph> = new Map();
  private metricsStore: Map<string, StructuredMetricsResult> = new Map();
  
  constructor(options: APIServerOptions = {}) {
    this.app = express();
    this.app.use(express.json());
    
    if (options.cors) {
      this.app.use((_req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
      });
    }
    
    this.setupRoutes();
  }
  
  /**
   * Store graph and metrics
   */
  store(id: string, graph: NetworkGraph, metrics: StructuredMetricsResult): void {
    this.graphStore.set(id, graph);
    this.metricsStore.set(id, metrics);
  }
  
  /**
   * Start server
   */
  async start(port: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`API Server listening on port ${port}`);
        resolve();
      });
    });
  }
  
  private setupRoutes(): void {
    // GET /api/v1/graphs
    this.app.get('/api/v1/graphs', (_req: Request, res: Response) => {
      const graphs = Array.from(this.graphStore.keys()).map(id => ({
        id,
        description: this.graphStore.get(id)?.description,
        nodes: this.graphStore.get(id)?.summary.total_nodes,
        edges: this.graphStore.get(id)?.summary.total_edges,
      }));
      res.json(graphs);
    });
    
    // GET /api/v1/graph/:id
    this.app.get('/api/v1/graph/:id', (req: Request, res: Response) => {
      const graph = this.graphStore.get(String(req.params.id));
      if (!graph) {
        return res.status(404).json({ error: 'Graph not found' });
      }
      res.json(graph);
    });
    
    // GET /api/v1/metrics/:id
    this.app.get('/api/v1/metrics/:id', (req: Request, res: Response) => {
      const metrics = this.metricsStore.get(String(req.params.id));
      if (!metrics) {
        return res.status(404).json({ error: 'Metrics not found' });
      }
      res.json(metrics);
    });
    
    // GET /api/v1/dashboard/:id
    this.app.get('/api/v1/dashboard/:id', (req: Request, res: Response) => {
      const graph = this.graphStore.get(String(req.params.id));
      const metrics = this.metricsStore.get(String(req.params.id));
      
      if (!graph || !metrics) {
        return res.status(404).json({ error: 'Data not found' });
      }
      
      // TODO: Generate inline dashboard HTML
      res.json({
        graph: graph.graph_id,
        note: 'Dashboard HTML generation not yet implemented for API route',
        suggestion: 'Use DashboardGenerator.generate(outputPath) directly',
      });
    });
    
    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', graphs: this.graphStore.size });
    });
  }
}
