/**
 * Web Configuration Server
 * 
 * Supports Discord, GitHub, OCTO, and Excel adapters via Web UI.
 */

import express, { Express, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { NetworkGraph } from '../layer2/models';
import { DiscordAdapter } from '../layer1/adapters/discord-adapter';
import { GitHubAdapter } from '../layer1/adapters/github-adapter';
import { OCTOAdapter } from '../layer1/adapters/octo-adapter';
import { ExcelAdapter } from '../layer1/adapters/excel-adapter';
import { ExcelTemplateGenerator } from '../layer1/adapters/excel-template';
import { MetricsCalculator } from '../layer4/metrics-calculator';
import { DashboardGenerator } from '../layer6/dashboard-generator';

export interface WebUIOptions {
  port?: number;
  outputDir?: string;
}

// Configure multer for file uploads
const upload = multer({
  dest: './uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files are allowed'));
    }
  }
});

export class ConfigServer {
  public app: Express;
  private outputDir: string;
  
  constructor(options: WebUIOptions = {}) {
    this.app = express();
    this.outputDir = options.outputDir || './output';
    
    // Create directories
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    if (!fs.existsSync('./uploads')) {
      fs.mkdirSync('./uploads', { recursive: true });
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
    
    // Download Excel template
    this.app.get('/api/template', async (_req: Request, res: Response) => {
      try {
        const generator = new ExcelTemplateGenerator();
        const tempPath = path.join(this.outputDir, `template_${Date.now()}.xlsx`);
        
        await generator.generate(tempPath);
        
        res.download(tempPath, 'OCTO-ONA-Template.xlsx', (err) => {
          // Clean up temp file
          fs.unlinkSync(tempPath);
          if (err) {
            console.error('Download error:', err);
          }
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Upload Excel file
    this.app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Parse Excel to get stats
        const adapter = new ExcelAdapter();
        await adapter.connect({ filePath: req.file.path });
        const graph = await adapter.extractNetwork();
        await adapter.disconnect();
        
        res.json({
          success: true,
          filePath: req.file.path,
          stats: {
            users: graph.summary.total_nodes,
            messages: graph.summary.total_messages,
          }
        });
      } catch (error: any) {
        // Clean up uploaded file on error
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        res.status(400).json({ error: error.message });
      }
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
          const octoAdapter = new OCTOAdapter({
            mode: 'remote',
            sourceId: 'dmwork-test',
            remoteConfig: {
              host: config.host,
              port: config.port,
              user: config.user,
              password: config.password,
              database: config.database,
            },
          });
          await octoAdapter.connect();
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
        
        // Clean up Excel upload if exists
        if (req.body.adapter === 'excel' && req.body.filePath) {
          try {
            fs.unlinkSync(req.body.filePath);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        
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
      const octoAdapter = new OCTOAdapter({
        mode: 'remote',
        sourceId: 'dmwork-web-ui',
        remoteConfig: {
          host: adapterConfig.host,
          port: adapterConfig.port,
          user: adapterConfig.user,
          password: adapterConfig.password,
          database: adapterConfig.database,
        },
      });
      await octoAdapter.connect();
      const graph = await octoAdapter.extractNetwork(options);
      await octoAdapter.disconnect();
      return graph;
    } else if (adapter === 'excel') {
      const excelAdapter = new ExcelAdapter();
      await excelAdapter.connect({ filePath: adapterConfig.filePath });
      const graph = await excelAdapter.extractNetwork();
      await excelAdapter.disconnect();
      return graph;
    } else {
      throw new Error(`Unsupported adapter: ${adapter}`);
    }
  }
}
