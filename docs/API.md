# OCTO-ONA API Reference

> Comprehensive API documentation for OCTO-ONA v1.1.0

---

## Table of Contents

1. [Data Models (Layer 2)](#data-models-layer-2)
2. [Data Adapters (Layer 1)](#data-adapters-layer-1)
3. [Analysis Engine (Layer 3)](#analysis-engine-layer-3)
4. [Metrics Calculator (Layer 4)](#metrics-calculator-layer-4)
5. [Analytics (Layer 5)](#analytics-layer-5)
6. [Exporters (Layer 6)](#exporters-layer-6)
7. [Web UI](#web-ui)

---

## Data Models (Layer 2)

### NetworkGraph

Complete network representation with nodes, edges, and messages.

```typescript
interface NetworkGraph {
  // Identity
  graph_id: string;
  description: string;
  version: string; // "2.0"
  created_at: Date;
  
  // Time range
  start_time: Date;
  end_time: Date;
  
  // Nodes
  human_nodes: HumanNode[];
  ai_agent_nodes: AIAgentNode[];
  
  // Edges
  edges: Edge[];
  
  // Messages (optional)
  messages?: Message[];
  
  // Summary
  summary: {
    total_nodes: number;
    total_humans: number;
    total_bots: number;
    total_edges: number;
    total_messages: number;
  };
}
```

### HumanNode

```typescript
interface HumanNode {
  id: string;
  name: string;
  type: 'human';
  role?: string;
  team?: string;
  email?: string;
  timezone?: string;
  created_at?: Date;
}
```

### AIAgentNode

```typescript
interface AIAgentNode {
  id: string;
  bot_name: string;
  type: 'ai_agent';
  creator_uid?: string;
  capabilities: string[];
  functional_tags: string[];
  avg_response_time?: number;
  created_at?: Date;
}
```

### Edge

```typescript
interface Edge {
  source: string; // Node ID
  target: string; // Node ID
  edge_type: 'H2H' | 'H2B' | 'B2H' | 'B2B';
  weight: number;
  is_cross_team: boolean;
  message_ids: string[];
  first_interaction?: Date;
  last_interaction?: Date;
}
```

### Message

```typescript
interface Message {
  id: string;
  from_uid: string;
  to_uids: string[];
  content: string;
  timestamp: Date;
  reply_to?: string;
  platform?: string;
  context_id?: string;
  is_connoisseurship?: boolean;
  connoisseurship_score?: number;
}
```

---

## Data Adapters (Layer 1)

### BaseAdapter (v2.0)

Minimal abstract interface for custom adapters.

```typescript
abstract class BaseAdapter {
  abstract connect(config: AdapterConfig): Promise<void>;
  abstract extractNetwork(options: any): Promise<NetworkGraph>;
  abstract disconnect(): Promise<void>;
}
```

### DMWorkAdapter

Database adapter for DMWork platform.

```typescript
class DMWorkAdapter extends BaseAdapter {
  constructor(config: DMWorkConfig);
  async connect(config: DMWorkConfig): Promise<void>;
  async extractNetwork(options: DMWorkExtractionOptions): Promise<NetworkGraph>;
  async disconnect(): Promise<void>;
}

interface DMWorkConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface DMWorkExtractionOptions {
  uidWhitelist?: string[];
  startTime?: Date;
  endTime?: Date;
  keywords?: string[];
}
```

### DiscordAdapter

Discord API adapter.

```typescript
class DiscordAdapter extends BaseAdapter {
  async connect(config: DiscordConfig): Promise<void>;
  async extractNetwork(options: DiscordExtractionOptions): Promise<NetworkGraph>;
  async disconnect(): Promise<void>;
}

interface DiscordConfig {
  token: string; // Bot token
  guildId: string;
}

interface DiscordExtractionOptions {
  channelIds?: string[];
  startTime: Date;
  endTime: Date;
  limit?: number;
}
```

### GitHubAdapter

GitHub GraphQL API adapter.

```typescript
class GitHubAdapter extends BaseAdapter {
  async connect(config: GitHubConfig): Promise<void>;
  async extractNetwork(options: GitHubExtractionOptions): Promise<NetworkGraph>;
  async disconnect(): Promise<void>;
}

interface GitHubConfig {
  token: string; // Personal Access Token
  owner: string;
  repo: string;
}

interface GitHubExtractionOptions {
  startTime: Date;
  endTime: Date;
  limit?: number;
}
```

### NetworkGraphBuilder

Utility for constructing NetworkGraph objects.

```typescript
class NetworkGraphBuilder {
  static separateUsers(users: Array<{id, name, is_bot}>): {
    humans: HumanNode[];
    bots: AIAgentNode[];
  };
  
  static buildEdges(
    messages: Array<{id, from, to, timestamp}>,
    humanIds: Set<string>,
    botIds: Set<string>
  ): Edge[];
  
  static markCrossTeamEdges(edges: Edge[], userTeams: Map<string, string>): Edge[];
  
  static build(params: {
    graphId: string;
    description: string;
    startTime: Date;
    endTime: Date;
    humans: HumanNode[];
    bots: AIAgentNode[];
    edges: Edge[];
    messages: Message[];
  }): NetworkGraph;
}
```

---

## Analysis Engine (Layer 3)

### AnalysisEngine

Core network analysis engine.

```typescript
class AnalysisEngine {
  constructor(graph: NetworkGraph);
  
  // Graph conversion
  toGraphology(): DirectedGraph;
  
  // Centrality metrics
  calculateDegreeCentrality(): Map<string, number>;
  calculateBetweennessCentrality(): Map<string, number>;
  calculateEigenvectorCentrality(): Map<string, number>;
  calculateClusteringCoefficient(): Map<string, number>;
  
  // Network metrics
  calculateDensity(): number;
  calculateModularity(): number;
  detectCommunities(): number[];
}
```

### ConnoisseurDetector

Connoisseurship behavior detection.

```typescript
class ConnoisseurDetector {
  constructor(graph: NetworkGraph);
  
  detect(message: Message): { isConnoisseurship: boolean; score: number };
  detectAll(): Message[];
}
```

---

## Metrics Calculator (Layer 4)

### MetricsCalculator

Calculates all network metrics.

```typescript
class MetricsCalculator {
  constructor(graph: NetworkGraph);
  
  registerMetric(metric: IMetric): void;
  calculateAll(priority?: 'P0' | 'P1'): Promise<MetricResult[]>;
}

interface MetricResult {
  id: string;
  name: string;
  category: string;
  value: number | string | boolean | any;
  priority: 'P0' | 'P1';
  timestamp: Date;
}
```

### StructuredMetricsResult

Organized metrics for exporters.

```typescript
interface StructuredMetricsResult {
  nodeMetrics: NodeMetrics[];
  networkMetrics: NetworkMetrics;
  botMetrics: BotMetrics[];
  timestamp: Date;
}

interface NodeMetrics {
  id: string;
  name: string;
  type: 'human' | 'bot';
  hubScore: number;
  connoisseurshipLayer: number;
  degreeCentrality: number;
  betweennessCentrality: number;
  eigenvectorCentrality: number;
  clusteringCoefficient: number;
}

interface NetworkMetrics {
  density: number;
  avgClusteringCoefficient: number;
  modularity: number;
  communities: number[];
}

interface BotMetrics {
  id: string;
  name: string;
  functionalTags: string[];
  hubScore: number;
}

function getStructuredMetrics(
  graph: NetworkGraph,
  results: MetricResult[]
): StructuredMetricsResult;
```

### BotTagger

Bot functional tag assignment.

```typescript
class BotTagger {
  constructor(graph: NetworkGraph);
  
  tagAll(): Map<string, string[]>; // Bot ID -> Tags
}

// Functional tags:
// - T1: Cross-Team Connector
// - T2: Intra-Team Hub
// - T3: Human Proxy
// - T4: Information Aggregator
// - T5: High Activity
```

---

## Analytics (Layer 5)

### ComparisonAnalyzer

Compare multiple networks.

```typescript
class ComparisonAnalyzer {
  compare(
    graphs: NetworkGraph[],
    metricsResults: MetricResult[][],
    options: {
      dimension: 'time' | 'team' | 'theme' | 'bot_version';
      labels?: string[];
    }
  ): ComparisonReport;
}

interface ComparisonReport {
  dimension: string;
  graphs: { id: string; label: string; metrics: StructuredMetricsResult }[];
  changes: {
    metricName: string;
    values: number[];
    changeRate: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  nodeChanges: {
    added: string[];
    removed: string[];
    hubScoreChanges: {
      nodeId: string;
      name: string;
      before: number;
      after: number;
      change: number;
    }[];
  };
  timestamp: Date;
}
```

### TrendAnalyzer

Time-series trend analysis and prediction.

```typescript
class TrendAnalyzer {
  analyzeTrend(
    graphs: NetworkGraph[],
    metricsResults: MetricResult[][],
    options: { predictNext?: boolean }
  ): TrendReport;
}

interface TrendReport {
  timePoints: Date[];
  trends: {
    metricName: string;
    values: number[];
    prediction?: number;
    slope: number;
    r2: number;
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
```

### HealthMonitor

Network health anomaly detection.

```typescript
class HealthMonitor {
  detectAnomalies(graph: NetworkGraph, metrics: StructuredMetricsResult): HealthReport;
}

interface HealthReport {
  score: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  issues: {
    type: 'isolated_nodes' | 'overload_risk' | 'connoisseur_deficit' | 'team_fragmentation';
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedNodes: string[];
    recommendation: string;
  }[];
  timestamp: Date;
}
```

### Recommender

Smart collaboration recommendations.

```typescript
class Recommender {
  suggestMentions(
    userId: string,
    graph: NetworkGraph,
    metrics: StructuredMetricsResult,
    options: { limit?: number }
  ): Recommendation[];
}

interface Recommendation {
  targetId: string;
  targetName: string;
  score: number; // 0-100
  reason: string;
  type: 'hub_score' | 'network_structure' | 'connoisseur' | 'similar_context';
}
```

---

## Exporters (Layer 6)

### DashboardGenerator

HTML dashboard generator.

```typescript
class DashboardGenerator {
  setNetworkGraph(graph: NetworkGraph): void;
  async generate(outputPath: string): Promise<void>;
}
```

### PDFExporter

PDF report exporter.

```typescript
class PDFExporter {
  async generate(
    graph: NetworkGraph,
    metrics: StructuredMetricsResult,
    options?: PDFExportOptions
  ): Promise<Buffer>;
}

interface PDFExportOptions {
  title?: string;
  author?: string;
  includeCharts?: boolean;
  pageSize?: 'A4' | 'Letter';
  landscape?: boolean;
}
```

### ExcelExporter

Excel workbook exporter.

```typescript
class ExcelExporter {
  async export(metrics: StructuredMetricsResult): Promise<Buffer>;
}
```

### ImageExporter

PNG chart exporter.

```typescript
class ImageExporter {
  async exportNetworkGraph(graph: NetworkGraph, options?: ImageExportOptions): Promise<Buffer>;
  async exportHubScoreChart(metrics: StructuredMetricsResult, options?: ImageExportOptions): Promise<Buffer>;
}

interface ImageExportOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
}
```

### APIServer

REST API server.

```typescript
class APIServer {
  constructor(options?: APIServerOptions);
  store(id: string, graph: NetworkGraph, metrics: StructuredMetricsResult): void;
  async start(port?: number): Promise<void>;
}

interface APIServerOptions {
  port?: number;
  cors?: boolean;
}

// Endpoints:
// GET /api/v1/graphs
// GET /api/v1/graph/:id
// GET /api/v1/metrics/:id
// GET /health
```

---

## Web UI

### ConfigServer

Web configuration UI server.

```typescript
class ConfigServer {
  constructor(options?: WebUIOptions);
  async start(port?: number): Promise<void>;
}

interface WebUIOptions {
  port?: number;
  outputDir?: string;
}

// UI accessible at http://localhost:3000
// Endpoints:
// POST /api/test-connection
// POST /api/preview
// POST /api/run-analysis
```

---

## Type Definitions

All type definitions are exported from `src/layer2/models.ts`:

```typescript
import {
  NetworkGraph,
  HumanNode,
  AIAgentNode,
  Edge,
  Message,
} from './layer2/models';
```

---

## Example Usage

### Complete Pipeline

```typescript
import { DMWorkAdapter } from './layer1/dmwork-adapter';
import { MetricsCalculator, getStructuredMetrics } from './layer4/metrics-calculator';
import { PDFExporter } from './layer6/pdf-exporter';

// 1. Extract network
const adapter = new DMWorkAdapter(config);
await adapter.connect(config);
const graph = await adapter.extractNetwork({ startTime, endTime });

// 2. Calculate metrics
const calculator = new MetricsCalculator(graph);
const results = await calculator.calculateAll('P0');
const metrics = getStructuredMetrics(graph, results);

// 3. Export PDF
const exporter = new PDFExporter();
const pdfBuffer = await exporter.generate(graph, metrics, { title: 'My Report' });

fs.writeFileSync('report.pdf', pdfBuffer);
```

---

## Version History

- **v1.1.0** (2026-03-20): Web UI, Discord/GitHub adapters, PDF/Excel/PNG/API exporters, advanced analytics
- **v1.0.0** (2026-03-19): Initial release with DMWork adapter, metrics calculator, dashboard

---

**Last Updated:** 2026-03-20  
**API Version:** 1.1.0
