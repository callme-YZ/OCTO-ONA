/**
 * Web Configuration Server
 * 
 * Supports Discord, GitHub, and OCTO adapters via Web UI.
 */

import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { NetworkGraph } from '../layer2/models';
import { DiscordAdapter } from '../layer1/adapters/discord-adapter';
import { GitHubAdapter } from '../layer1/adapters/github-adapter';
import { OCTOAdapter } from '../layer1/adapters/octo-adapter';
import { MetricsCalculator } from '../layer4/metrics-calculator';
import { DashboardGenerator } from '../layer6/dashboard-generator';

export interface WebUIOptions {
  port?: number;
  outputDir?: string;
}

export class ConfigServer {
  public app: Express;
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
        const { adapter, ...config } = req.body;
        
        if (adapter === 'discord') {
          const discordAdapter = new DiscordAdapter();
          await discordAdapter.connect({ token: config.token, guildId: config.guildId });
          await discordAdapter.disconnect();
          res.json({ success: true });
        } else if (adapter === 'github') {
          const githubAdapter = new GitHubAdapter();
          await githubAdapter.connect({ token: config.token, owner: config.owner, repo: config.repo });
          await githubAdapter.disconnect();
          res.json({ success: true });
        } else if (adapter === 'octo') {
          const octoAdapter = new OCTOAdapter();
          await octoAdapter.connect({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database
          });
          await octoAdapter.disconnect();
          res.json({ success: true });
        } else {
          res.status(400).json({ error: 'Unsupported adapter' });
        }
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });
    
    // Preview analysis
    this.app.post('/api/preview', async (req: Request, res: Response) => {
      try {
        const graph = await this.extractNetwork(req.body);
        
        res.json({
          stats: {
            totalNodes: graph.summary.total_nodes,
            totalHumans: graph.summary.total_humans,
            totalBots: graph.summary.total_bots,
            totalEdges: graph.summary.total_edges,
            totalMessages: graph.summary.total_messages,
            startTime: graph.start_time,
            endTime: graph.end_time,
          },
        });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });
    
    // Run analysis
    this.app.post('/api/run-analysis', async (req: Request, res: Response) => {
      try {
        const graph = await this.extractNetwork(req.body);
        
        // Calculate metrics
        const calculator = new MetricsCalculator(graph);
        const results = await calculator.calculateAll('P0');
        
        // Generate dashboard
        const generator = new DashboardGenerator(graph);
        const timestamp = Date.now();
        const dashboardPath = path.join(this.outputDir, `dashboard_${timestamp}.html`);
        
        await generator.generate(dashboardPath);
        
        res.json({
          success: true,
          dashboardPath: `/output/dashboard_${timestamp}.html`,
          stats: {
            nodes: graph.summary.total_nodes,
            edges: graph.summary.total_edges,
            messages: graph.summary.total_messages,
          },
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Serve output files
    this.app.use('/output', express.static(this.outputDir));
  }
  
  private async extractNetwork(config: any): Promise<NetworkGraph> {
    const { adapter, startTime, endTime, channelIds, ...adapterConfig } = config;
    
    const options: any = {};
    if (startTime) options.startTime = new Date(startTime);
    if (endTime) options.endTime = new Date(endTime);
    if (channelIds) options.channelIds = channelIds;
    
    if (adapter === 'discord') {
      const discordAdapter = new DiscordAdapter();
      await discordAdapter.connect({ token: adapterConfig.token, guildId: adapterConfig.guildId });
      const graph = await discordAdapter.extractNetwork(options);
      await discordAdapter.disconnect();
      return graph;
    } else if (adapter === 'github') {
      const githubAdapter = new GitHubAdapter();
      await githubAdapter.connect({ 
        token: adapterConfig.token, 
        owner: adapterConfig.owner, 
        repo: adapterConfig.repo 
      });
      const graph = await githubAdapter.extractNetwork(options);
      await githubAdapter.disconnect();
      return graph;
    } else if (adapter === 'octo') {
      const octoAdapter = new OCTOAdapter();
      await octoAdapter.connect({
        host: adapterConfig.host,
        port: adapterConfig.port,
        user: adapterConfig.user,
        password: adapterConfig.password,
        database: adapterConfig.database
      });
      const graph = await octoAdapter.extractNetwork(options);
      await octoAdapter.disconnect();
      return graph;
    } else {
      throw new Error(`Unsupported adapter: ${adapter}`);
    }
  }
}
