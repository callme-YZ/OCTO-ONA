/**
 * Web Configuration Server (Simplified)
 * 
 * Supports Discord and GitHub adapters only.
 * DMWork adapter uses legacy BaseAdapter and requires separate CLI.
 */

import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { NetworkGraph } from '../layer2/models';
import { DiscordAdapter } from '../layer1/adapters/discord-adapter';
import { GitHubAdapter } from '../layer1/adapters/github-adapter';
import { MetricsCalculator, getStructuredMetrics } from '../layer4/metrics-calculator';

export interface WebUIOptions {
  port?: number;
  outputDir?: string;
}

export class ConfigServer {
  private app: Express;
  private outputDir: string;
  
  constructor(options: WebUIOptions = {}) {
    this.app = express();
    this.outputDir = options.outputDir || './output';
    
    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    this.setupRoutes();
  }
  
  async start(port: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`🌐 Web UI: http://localhost:${port}`);
        resolve();
      });
    });
  }
  
  private setupRoutes(): void {
    // Serve main UI
    this.app.get('/', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    
    // Test connection
    this.app.post('/api/test-connection', async (req: Request, res: Response) => {
      try {
        const { adapterType, config } = req.body;
        
        if (adapterType === 'discord') {
          const adapter = new DiscordAdapter();
          await adapter.connect(config);
          await adapter.disconnect();
          res.json({ success: true, message: 'Discord connection OK' });
        } else if (adapterType === 'github') {
          const adapter = new GitHubAdapter();
          await adapter.connect(config);
          await adapter.disconnect();
          res.json({ success: true, message: 'GitHub connection OK' });
        } else {
          res.status(400).json({ success: false, message: 'Unsupported adapter' });
        }
      } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
      }
    });
    
    // Preview analysis
    this.app.post('/api/preview', async (req: Request, res: Response) => {
      try {
        const { adapterType, config, filters } = req.body;
        const graph = await this.extractNetwork(adapterType, config, filters);
        
        res.json({
          nodeCount: graph.summary.total_nodes,
          humanCount: graph.summary.total_humans,
          botCount: graph.summary.total_bots,
          edgeCount: graph.summary.total_edges,
          messageCount: graph.summary.total_messages,
          timeRange: {
            start: graph.start_time,
            end: graph.end_time,
          },
        });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });
    
    // Run analysis
    this.app.post('/api/run-analysis', async (req: Request, res: Response) => {
      try {
        const { adapterType, config, filters } = req.body;
        const graph = await this.extractNetwork(adapterType, config, filters);
        
        // Calculate metrics
        const calculator = new MetricsCalculator(graph);
        const results = await calculator.calculateAll('P0');
        const metrics = getStructuredMetrics(graph, results);
        
        // Save graph
        const timestamp = Date.now();
        const outputPath = path.join(this.outputDir, `analysis_${timestamp}.json`);
        fs.writeFileSync(outputPath, JSON.stringify({ graph, metrics }, null, 2));
        
        res.json({
          success: true,
          outputPath,
          metrics: {
            nodeCount: graph.summary.total_nodes,
            edgeCount: graph.summary.total_edges,
            avgHubScore: metrics.nodeMetrics
              .filter(n => n.hubScore !== Infinity)
              .reduce((sum, n) => sum + n.hubScore, 0) / metrics.nodeMetrics.length || 0,
          },
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }
  
  private async extractNetwork(
    adapterType: string,
    config: any,
    filters: any
  ): Promise<NetworkGraph> {
    if (adapterType === 'discord') {
      const adapter = new DiscordAdapter();
      await adapter.connect(config);
      const graph = await adapter.extractNetwork(filters);
      await adapter.disconnect();
      return graph;
    } else if (adapterType === 'github') {
      const adapter = new GitHubAdapter();
      await adapter.connect(config);
      const graph = await adapter.extractNetwork(filters);
      await adapter.disconnect();
      return graph;
    } else {
      throw new Error(`Unsupported adapter: ${adapterType}`);
    }
  }
}
