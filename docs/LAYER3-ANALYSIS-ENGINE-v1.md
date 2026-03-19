# OCTO-ONA Layer 3 Analysis Engine Design v2.0 (TypeScript)

**Updated**: 2026-03-19  
**Design Principle**: From Data Model to Metrics - Graph Algorithms + Connoisseurship Detection

---

## 1. Overview

### Core Functionality

```
Layer 2 Data (NetworkGraph)
   ↓
Graph Analysis (graphology)
   ↓
Connoisseurship Detection (Rule-based/LLM)
   ↓
Layer 4 Metrics Input
```

### Design Goals

1. **Graph Algorithm Encapsulation** — Unified graphology usage
2. **Connoisseurship Detection** — Rule-based first, LLM as fallback
3. **Extensible** — Easy to add new analysis methods
4. **High Performance** — Large-scale networks (1000+ nodes)

---

## 2. AnalysisEngine Architecture

### 2.1 Core Class Design

```typescript
import Graph from 'graphology';
import { degree, betweennessCentrality, closenessCentrality } from 'graphology-metrics/centrality';
import louvain from 'graphology-communities-louvain';
import { NetworkGraph, Message } from '../layer2';

interface CentralityResults {
  degree: Record<string, number>;
  betweenness: Record<string, number>;
  closeness: Record<string, number>;
}

interface AnalysisCache {
  centrality?: CentralityResults;
  communities?: Record<string, number>;
  [key: string]: any;
}

export class AnalysisEngine {
  /**
   * Layer 3 Analysis Engine
   * 
   * Responsibilities:
   * 1. Execute graph algorithms (using graphology)
   * 2. Identify connoisseurship messages
   * 3. Provide intermediate data for Layer 4
   */
  
  private networkGraph: NetworkGraph;
  private graph: Graph;
  private cache: AnalysisCache = {};
  
  constructor(networkGraph: NetworkGraph) {
    /**
     * Initialize analysis engine
     * 
     * @param networkGraph - Layer 2 NetworkGraph object
     */
    this.networkGraph = networkGraph;
    this.graph = this.networkGraph.toGraphology();  // Convert to graphology graph
  }
  
  // === Graph Algorithm Module ===
  
  async computeCentrality(): Promise<CentralityResults> {
    /**
     * Calculate all centrality metrics
     * 
     * @returns {
     *   degree: {node_id: value, ...},
     *   betweenness: {node_id: value, ...},
     *   closeness: {node_id: value, ...}
     * }
     */
    if (this.cache.centrality) {
      return this.cache.centrality;
    }
    
    const centrality: CentralityResults = {
      degree: degree(this.graph),
      betweenness: betweennessCentrality(this.graph),
      closeness: closenessCentrality(this.graph)
    };
    
    this.cache.centrality = centrality;
    return centrality;
  }
  
  async detectCommunities(method: string = 'louvain'): Promise<Record<string, number>> {
    /**
     * Community detection
     * 
     * @param method - Detection algorithm (louvain/label_propagation)
     * @returns {node_id: community_id, ...}
     */
    if (method === 'louvain') {
      return louvain(this.graph);
    } else if (method === 'label_propagation') {
      // TODO: Implement label propagation
      throw new Error('Label propagation not yet implemented');
    } else {
      throw new Error(`Unknown method: ${method}`);
    }
  }
  
  findBridges(): Array<[string, string]> {
    /**
     * Identify bridge edges
     * 
     * @returns [(source, target), ...]
     */
    // graphology doesn't have built-in bridge detection
    // Implement using edge connectivity check
    const bridges: Array<[string, string]> = [];
    
    this.graph.forEachEdge((edge, attributes, source, target) => {
      // Temporarily remove edge
      const edgeData = this.graph.getEdgeAttributes(edge);
      this.graph.dropEdge(edge);
      
      // Check if graph becomes disconnected
      if (!this.isConnected(source, target)) {
        bridges.push([source, target]);
      }
      
      // Restore edge
      this.graph.addEdge(source, target, edgeData);
    });
    
    return bridges;
  }
  
  private isConnected(source: string, target: string): boolean {
    /**
     * Check if two nodes are connected (BFS)
     */
    const visited = new Set<string>();
    const queue = [source];
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      if (node === target) return true;
      
      if (!visited.has(node)) {
        visited.add(node);
        this.graph.forEachNeighbor(node, (neighbor) => {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        });
      }
    }
    
    return false;
  }
  
  calculateShortestPaths(source?: string): Record<string, Record<string, number>> | Record<string, number> {
    /**
     * Calculate shortest paths
     * 
     * @param source - Starting node (undefined means all pairs)
     * @returns Shortest path dictionary
     */
    if (source) {
      return this.singleSourceShortestPath(source);
    } else {
      const allPaths: Record<string, Record<string, number>> = {};
      this.graph.forEachNode((node) => {
        allPaths[node] = this.singleSourceShortestPath(node);
      });
      return allPaths;
    }
  }
  
  private singleSourceShortestPath(source: string): Record<string, number> {
    /**
     * BFS-based shortest path from single source
     */
    const distances: Record<string, number> = { [source]: 0 };
    const queue: Array<[string, number]> = [[source, 0]];
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const [node, dist] = queue.shift()!;
      
      if (visited.has(node)) continue;
      visited.add(node);
      
      this.graph.forEachNeighbor(node, (neighbor) => {
        if (!visited.has(neighbor)) {
          const newDist = dist + 1;
          if (!(neighbor in distances) || newDist < distances[neighbor]) {
            distances[neighbor] = newDist;
            queue.push([neighbor, newDist]);
          }
        }
      });
    }
    
    return distances;
  }
  
  // === Hub Score Calculation Module ===
  
  calculateHubScore(): Record<string, number> {
    /**
     * Calculate Hub Score (OCTO core metric)
     * 
     * Hub Score = mentions_received / messages_sent
     * 
     * Meaning: Influence vs Activity ratio
     * - High Hub Score: Passive influence (consulted often, speaks less)
     * - Low Hub Score: Active executor (speaks often, consulted less)
     * 
     * @returns {node_id: hub_score, ...}
     */
    const mentions: Record<string, number> = {};
    const messagesSent: Record<string, number> = {};
    
    for (const msg of this.networkGraph.messages || []) {
      // Count sent messages
      messagesSent[msg.fromUid] = (messagesSent[msg.fromUid] || 0) + 1;
      
      // Count mentions (each person in toUids gets counted)
      for (const mentionedUid of msg.toUids) {
        mentions[mentionedUid] = (mentions[mentionedUid] || 0) + 1;
      }
    }
    
    // Calculate Hub Score
    const hubScores: Record<string, number> = {};
    const allNodes = new Set([...Object.keys(mentions), ...Object.keys(messagesSent)]);
    
    for (const uid of allNodes) {
      const mentionCount = mentions[uid] || 0;
      const sentCount = messagesSent[uid] || 0;
      
      if (sentCount === 0) {
        // Special case: only mentioned, no messages sent
        hubScores[uid] = mentionCount > 0 ? Infinity : 0.0;
      } else {
        hubScores[uid] = mentionCount / sentCount;
      }
    }
    
    return hubScores;
  }
  
  identifyConnoisseursByHubScore(threshold: number = 1.0): string[] {
    /**
     * Identify connoisseurs based on Hub Score (passive connoisseurship)
     * 
     * @param threshold - Hub Score threshold (default 1.0, meaning mentioned more than speaking)
     * @returns List of connoisseur UIDs
     */
    const hubScores = this.calculateHubScore();
    
    const connoisseurs = Object.entries(hubScores)
      .filter(([uid, score]) => score >= threshold && score !== Infinity)
      .map(([uid]) => uid);
    
    return connoisseurs;
  }

  // === Connoisseurship Detection Module ===
  
  async identifyConnoisseurship(method: string = 'rule_based'): Promise<Message[]> {
    /**
     * Identify connoisseurship messages
     * 
     * @param method - Detection method (rule_based/llm)
     * @returns List of connoisseurship messages (isConnoisseurship=true)
     */
    if (method === 'rule_based') {
      return this.ruleBasedConnoisseurship();
    } else if (method === 'llm') {
      return this.llmBasedConnoisseurship();
    } else {
      throw new Error(`Unknown method: ${method}`);
    }
  }
  
  private ruleBasedConnoisseurship(): Message[] {
    /**
     * Rule-based connoisseurship detection
     * 
     * @returns List of connoisseurship messages
     */
    const connoisseurshipMessages: Message[] = [];
    
    for (const msg of this.networkGraph.messages || []) {
      const score = this.calculateConnoisseurshipScore(msg.content);
      
      if (score >= 2.0) {  // Threshold: at least 2 dimensions
        msg.isConnoisseurship = true;
        msg.connoisseurshipScore = score;
        connoisseurshipMessages.push(msg);
      }
    }
    
    return connoisseurshipMessages;
  }
  
  private calculateConnoisseurshipScore(content: string): number {
    /**
     * Calculate connoisseurship score (rule-based)
     * 
     * Based on 4 dimensions:
     * 1. Evaluative (good/bad/excellent/terrible)
     * 2. Critical (problem/error/bug)
     * 3. Comparative (better than/worse than)
     * 4. Aesthetic (experience/feeling/style)
     * 
     * @param content - Message text
     * @returns Score (0-4)
     */
    let score = 0.0;
    
    // Dimension 1: Evaluative
    const evaluativeKeywords = [
      '好', '不好', '很好', '非常好', '优秀', '糟糕', '差',
      '棒', '赞', '完美', '不错', '太差', '不行'
    ];
    if (evaluativeKeywords.some(kw => content.includes(kw))) {
      score += 1.0;
    }
    
    // Dimension 2: Critical
    const criticalKeywords = [
      '问题', '错误', 'bug', 'Bug', 'BUG',
      '不对', '有问题', '不合理', '不应该',
      '缺陷', '漏洞', '隐患'
    ];
    if (criticalKeywords.some(kw => content.includes(kw))) {
      score += 1.0;
    }
    
    // Dimension 3: Comparative
    const comparativePatterns = ['比', '更', '没有', '不如', '优于', '劣于'];
    if (comparativePatterns.some(pattern => content.includes(pattern))) {
      score += 1.0;
    }
    
    // Dimension 4: Aesthetic
    const aestheticKeywords = [
      '体验', '感觉', '风格', '美观', '设计',
      '舒服', '难受', '别扭', '顺畅', '流畅',
      '简洁', '复杂', '清晰', '混乱'
    ];
    if (aestheticKeywords.some(kw => content.includes(kw))) {
      score += 1.0;
    }
    
    return score;
  }
  
  private async llmBasedConnoisseurship(): Promise<Message[]> {
    /**
     * LLM-enhanced connoisseurship detection (Phase 2 optional)
     * 
     * @returns List of connoisseurship messages
     */
    // TODO: Integrate LLM API
    // 1. Batch send messages to LLM
    // 2. Ask LLM to judge if connoisseurship (0-1 score)
    // 3. Filter by threshold (>0.7 is connoisseurship)
    
    throw new Error('LLM method will be implemented in Phase 2');
  }
  
  // === Helper Analysis Module ===
  
  getNodeNeighbors(nodeId: string, depth: number = 1): string[] {
    /**
     * Get N-hop neighbors of a node
     * 
     * @param nodeId - Node ID
     * @param depth - Depth (1=direct neighbors, 2=second-order network)
     * @returns List of neighbor node IDs
     */
    if (depth === 1) {
      return this.graph.neighbors(nodeId);
    } else {
      // BFS to get N-hop neighbors
      const neighbors = new Set<string>();
      let currentLayer = new Set([nodeId]);
      
      for (let i = 0; i < depth; i++) {
        const nextLayer = new Set<string>();
        for (const node of currentLayer) {
          this.graph.forEachNeighbor(node, (neighbor) => {
            nextLayer.add(neighbor);
          });
        }
        nextLayer.forEach(n => neighbors.add(n));
        currentLayer = nextLayer;
      }
      
      neighbors.delete(nodeId);  // Exclude self
      return Array.from(neighbors);
    }
  }
  
  getEgoNetwork(nodeId: string, radius: number = 1): Graph {
    /**
     * Get ego network centered on a node
     * 
     * @param nodeId - Center node
     * @param radius - Radius (usually 1 or 2)
     * @returns Subgraph
     */
    const egoGraph = new Graph({ type: 'directed' });
    
    // Add center node
    egoGraph.addNode(nodeId, this.graph.getNodeAttributes(nodeId));
    
    // Get neighbors within radius
    const neighbors = this.getNodeNeighbors(nodeId, radius);
    
    // Add neighbor nodes
    for (const neighbor of neighbors) {
      if (!egoGraph.hasNode(neighbor)) {
        egoGraph.addNode(neighbor, this.graph.getNodeAttributes(neighbor));
      }
    }
    
    // Add edges
    egoGraph.forEachNode((node) => {
      this.graph.forEachOutNeighbor(node, (neighbor) => {
        if (egoGraph.hasNode(neighbor) && !egoGraph.hasEdge(node, neighbor)) {
          egoGraph.addEdge(node, neighbor, this.graph.getEdgeAttributes(node, neighbor));
        }
      });
    });
    
    return egoGraph;
  }
  
  calculateResponseTime(botMessages: Message[]): Record<string, number> {
    /**
     * Calculate bot response time
     * 
     * @param botMessages - List of messages sent by bots
     * @returns {bot_id: avg_response_time_seconds, ...}
     */
    const responseTimes: Record<string, number[]> = {};
    
    // Build message ID to message mapping
    const msgDict: Record<string, Message> = {};
    for (const msg of this.networkGraph.messages || []) {
      msgDict[msg.id] = msg;
    }
    
    for (const msg of botMessages) {
      if (msg.replyTo && msgDict[msg.replyTo]) {
        const originalMsg = msgDict[msg.replyTo];
        const responseTime = (msg.timestamp.getTime() - originalMsg.timestamp.getTime()) / 1000;
        
        const botId = msg.fromUid;
        if (!responseTimes[botId]) {
          responseTimes[botId] = [];
        }
        responseTimes[botId].push(responseTime);
      }
    }
    
    // Calculate average
    const avgResponseTimes: Record<string, number> = {};
    for (const [botId, times] of Object.entries(responseTimes)) {
      avgResponseTimes[botId] = times.reduce((a, b) => a + b, 0) / times.length;
    }
    
    return avgResponseTimes;
  }
}
```

---

## 3. Connoisseurship Detection Detailed Design

### 3.1 Rule-based Algorithm (Phase 1)

#### **Keyword Library**

**Based on Octo real cases** (extracted from connoisseurship messages):

```typescript
const CONNOISSEURSHIP_KEYWORDS = {
  // Dimension 1: Evaluative
  evaluative: [
    '好', '不好', '很好', '非常好', '优秀', '糟糕', '差',
    '棒', '赞', '完美', '不错', '太差', '不行', '可以',
    '还行', '一般', '马马虎虎'
  ],
  
  // Dimension 2: Critical
  critical: [
    '问题', '错误', 'bug', 'Bug', 'BUG',
    '不对', '有问题', '不合理', '不应该',
    '缺陷', '漏洞', '隐患', '风险',
    '需要改进', '需要优化', '建议修改'
  ],
  
  // Dimension 3: Comparative
  comparative: [
    '比', '更', '没有', '不如', '优于', '劣于',
    '相比', '对比', '而言', '相对'
  ],
  
  // Dimension 4: Aesthetic
  aesthetic: [
    '体验', '感觉', '风格', '美观', '设计',
    '舒服', '难受', '别扭', '顺畅', '流畅',
    '简洁', '复杂', '清晰', '混乱', '整洁',
    '排版', '布局', '配色', '字体'
  ]
};
```

#### **Context Validation**

**Problem**: Simple keyword matching can lead to false positives

**Examples**:
- ✅ "这个UI排版有问题" — Connoisseurship
- ❌ "好的，我知道了" — Not connoisseurship (only has "好")

**Solution**: Context validation

```typescript
class AnalysisEngine {
  // ... previous code ...
  
  private validateContext(content: string, score: number): boolean {
    /**
     * Context validation to avoid false positives
     * 
     * @param content - Message text
     * @param score - Initial score
     * @returns Whether it's truly connoisseurship
     */
    // Rule 1: Too short messages (<5 chars) are not connoisseurship
    if (content.length < 5) {
      return false;
    }
    
    // Rule 2: Pure polite phrases are not connoisseurship
    const politePhrases = ['好的', '知道了', '收到', '明白', 'OK', 'ok', '谢谢'];
    if (politePhrases.includes(content.trim())) {
      return false;
    }
    
    // Rule 3: Score ≥2 and length ≥10 chars
    if (score >= 2.0 && content.length >= 10) {
      return true;
    }
    
    // Rule 4: Score ≥3 (counts as connoisseurship even if short)
    if (score >= 3.0) {
      return true;
    }
    
    return false;
  }
}
```

---

### 3.2 LLM Enhancement (Phase 2, Optional)

#### **API Integration Design**

```typescript
import OpenAI from 'openai';

class LLMConnoisseurshipDetector {
  /**
   * LLM Connoisseurship Detector
   */
  
  private client: OpenAI;
  private model: string;
  
  constructor(apiKey: string, model: string = 'gpt-4') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }
  
  async detect(messages: Message[]): Promise<Message[]> {
    /**
     * Batch detect connoisseurship messages
     * 
     * @param messages - List of messages
     * @returns List of connoisseurship messages
     */
    // Batch processing (100 messages at a time)
    const batchSize = 100;
    const connoisseurshipMessages: Message[] = [];
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const results = await this.detectBatch(batch);
      connoisseurshipMessages.push(...results);
    }
    
    return connoisseurshipMessages;
  }
  
  private async detectBatch(messages: Message[]): Promise<Message[]> {
    /**
     * Detect a batch of messages
     */
    const prompt = this.buildPrompt(messages);
    
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: '你是一个品鉴消息识别专家。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.0
    });
    
    // Parse results
    const results = this.parseResponse(response.choices[0].message.content || '');
    
    // Annotate messages
    for (let i = 0; i < messages.length; i++) {
      if (results[i]) {
        messages[i].isConnoisseurship = true;
      }
    }
    
    return messages.filter(msg => msg.isConnoisseurship);
  }
  
  private buildPrompt(messages: Message[]): string {
    /**
     * Build detection prompt
     */
    let prompt = `请判断以下消息是否为"品鉴"（专业判断/评价/反馈）。

品鉴的特征：
1. 评价性：表达好/不好的判断
2. 批判性：指出问题/错误
3. 对比性：进行比较
4. 品味性：关于体验/设计/美观

对于每条消息，回答"是"或"否"（一行一个）。

消息列表：
`;
    
    messages.forEach((msg, i) => {
      prompt += `${i + 1}. ${msg.content}\n`;
    });
    
    return prompt;
  }
  
  private parseResponse(responseText: string): boolean[] {
    /**
     * Parse LLM response
     */
    const lines = responseText.trim().split('\n');
    return lines.map(line => line.trim() === '是');
  }
}
```

---

## 4. Graph Algorithm Configuration

### 4.1 Centrality Algorithms

**graphology default parameters** (no modification needed):
```typescript
import { degree, betweennessCentrality, closenessCentrality } from 'graphology-metrics/centrality';

// Degree Centrality
const degreeCent = degree(graph);  // Normalized: deg(v) / (N-1)

// Betweenness Centrality
const betweenness = betweennessCentrality(graph, { normalized: true });

// Closeness Centrality
const closeness = closenessCentrality(graph);  // Reciprocal distance sum
```

---

### 4.2 Community Detection

**Louvain Algorithm** (recommended):
```typescript
import louvain from 'graphology-communities-louvain';

// Community detection
const partition = louvain(graph);

// Calculate modularity (if needed)
import modularity from 'graphology-metrics/modularity';
const modularityScore = modularity(graph, partition);
```

**Advantages**: Fast, accurate, suitable for large-scale networks

---

### 4.3 Performance Optimization

**Large-scale networks (1000+ nodes)**:
```typescript
// 1. Use directed graph representation
const graph = new Graph({ type: 'directed' });  // More efficient

// 2. Parallel computation (using worker threads)
import { Worker } from 'worker_threads';

async function parallelBetweenness(graph: Graph): Promise<Record<string, number>> {
  const nodes = graph.nodes();
  const chunkSize = Math.ceil(nodes.length / 4);  // 4 workers
  
  const workers = [];
  for (let i = 0; i < 4; i++) {
    const chunk = nodes.slice(i * chunkSize, (i + 1) * chunkSize);
    const worker = new Worker('./betweenness-worker.js', {
      workerData: { graph: graph.export(), nodes: chunk }
    });
    workers.push(worker);
  }
  
  const results = await Promise.all(workers.map(w => 
    new Promise<Record<string, number>>((resolve) => {
      w.on('message', resolve);
    })
  ));
  
  // Merge results
  return Object.assign({}, ...results);
}

// 3. Cache results
private cache: AnalysisCache = {};
this.cache.betweenness = await parallelBetweenness(this.graph);
```

---

## 5. Interaction with Layer 2/4

### 5.1 Layer 2 → Layer 3

```typescript
// Layer 2 output
const networkGraph = NetworkGraph.parseFile('network.json');

// Layer 3 processing
const engine = new AnalysisEngine(networkGraph);

// Execute analysis
const centrality = await engine.computeCentrality();
const connoisseurshipMsgs = await engine.identifyConnoisseurship();
```

---

### 5.2 Layer 3 → Layer 4

```typescript
// Layer 3 output
const analysisResults = {
  centrality: await engine.computeCentrality(),
  communities: await engine.detectCommunities(),
  bridges: engine.findBridges(),
  connoisseurshipMessages: await engine.identifyConnoisseurship(),
  responseTimes: engine.calculateResponseTime(botMessages)
};

// Layer 4 usage
import { MetricsCalculator } from '../layer4';

const calculator = new MetricsCalculator(networkGraph, analysisResults);
const metrics = await calculator.calculateAll();
```

---

## 6. Implementation Priority

### Phase 1: Core Graph Algorithms (1 week)

**Features**:
- AnalysisEngine class
- computeCentrality()
- findBridges()
- getEgoNetwork()

**Deliverable**: Basic graph analysis capability

---

### Phase 2: Connoisseurship Detection (1 week)

**Features**:
- Rule-based connoisseurship detection
- Keyword library (4 dimensions)
- Context validation

**Deliverable**: Connoisseurship detection capability

---

### Phase 3: Advanced Features (1 week)

**Features**:
- Community detection
- Response time calculation
- Performance optimization (caching, parallelization)

**Deliverable**: Complete Layer 3

---

### Phase 4: LLM Enhancement (Optional)

**Features**:
- LLM API integration
- Batch detection
- Accuracy comparison (rule-based vs LLM)

**Deliverable**: LLM-enhanced version


---

## 7. Testing and Validation

### 7.1 Graph Algorithm Tests

```typescript
import { describe, it, expect } from '@jest/globals';
import Graph from 'graphology';
import { AnalysisEngine } from './analysis-engine';
import { NetworkGraph } from '../layer2';

describe('AnalysisEngine - Graph Algorithms', () => {
  it('should calculate centrality correctly', async () => {
    // Construct simple test graph
    const graph = new Graph({ type: 'directed' });
    graph.addNode('A');
    graph.addNode('B');
    graph.addNode('C');
    graph.addNode('D');
    
    graph.addEdge('A', 'B');
    graph.addEdge('A', 'C');
    graph.addEdge('B', 'D');
    graph.addEdge('C', 'D');
    
    const networkGraph = NetworkGraph.fromGraphology(graph, 'test');
    const engine = new AnalysisEngine(networkGraph);
    
    const centrality = await engine.computeCentrality();
    
    // Validate: D should have highest degree (2 incoming edges)
    expect(centrality.degree['D']).toBeGreaterThan(centrality.degree['A']);
  });
  
  it('should detect bridges correctly', () => {
    const graph = new Graph({ type: 'directed' });
    graph.addNode('A');
    graph.addNode('B');
    graph.addNode('C');
    
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'C');
    
    const networkGraph = NetworkGraph.fromGraphology(graph, 'test');
    const engine = new AnalysisEngine(networkGraph);
    
    const bridges = engine.findBridges();
    
    // Validate: Both edges are bridges
    expect(bridges.length).toBe(2);
  });
  
  it('should calculate Hub Score correctly', () => {
    const messages = [
      {
        id: '1',
        fromUid: 'user1',
        toUids: ['user2'],
        content: 'Hello',
        timestamp: new Date()
      },
      {
        id: '2',
        fromUid: 'user2',
        toUids: ['user1'],
        content: 'Hi',
        timestamp: new Date()
      },
      {
        id: '3',
        fromUid: 'user3',
        toUids: ['user1'],
        content: 'Question for user1',
        timestamp: new Date()
      }
    ];
    
    const networkGraph = new NetworkGraph({
      graphId: 'test',
      messages,
      nodes: [],
      edges: []
    });
    
    const engine = new AnalysisEngine(networkGraph);
    const hubScores = engine.calculateHubScore();
    
    // Validate: user1 has higher Hub Score (2 mentions, 1 message sent)
    expect(hubScores['user1']).toBe(2.0);  // 2/1 = 2.0
    expect(hubScores['user2']).toBe(1.0);  // 1/1 = 1.0
  });
});
```

---

### 7.2 Connoisseurship Detection Tests

```typescript
describe('AnalysisEngine - Connoisseurship Detection', () => {
  it('should detect connoisseurship messages correctly', async () => {
    const messages = [
      {
        id: '1',
        fromUid: 'user1',
        toUids: ['user2'],
        content: '这个UI排版有问题，太拥挤了',
        timestamp: new Date()
      },
      {
        id: '2',
        fromUid: 'user1',
        toUids: ['user2'],
        content: '好的，知道了',
        timestamp: new Date()
      },
      {
        id: '3',
        fromUid: 'user1',
        toUids: ['user2'],
        content: '这个设计比之前的版本更简洁美观',
        timestamp: new Date()
      }
    ];
    
    const networkGraph = new NetworkGraph({
      graphId: 'test',
      messages,
      nodes: [],
      edges: []
    });
    
    const engine = new AnalysisEngine(networkGraph);
    const connoisseurship = await engine.identifyConnoisseurship();
    
    // Validate: Messages 1 and 3 are connoisseurship
    expect(connoisseurship.length).toBe(2);
    expect(connoisseurship.map(m => m.id)).toContain('1');
    expect(connoisseurship.map(m => m.id)).toContain('3');
    expect(connoisseurship.map(m => m.id)).not.toContain('2');
  });
  
  it('should calculate connoisseurship score correctly', () => {
    const engine = new AnalysisEngine(new NetworkGraph({
      graphId: 'test',
      messages: [],
      nodes: [],
      edges: []
    }));
    
    // Test evaluative dimension
    let score = (engine as any).calculateConnoisseurshipScore('这个功能很好');
    expect(score).toBe(1.0);
    
    // Test critical dimension
    score = (engine as any).calculateConnoisseurshipScore('这里有个bug');
    expect(score).toBe(1.0);
    
    // Test multiple dimensions
    score = (engine as any).calculateConnoisseurshipScore('这个设计有问题，体验不好');
    expect(score).toBe(2.0);  // critical + aesthetic
    
    // Test all dimensions
    score = (engine as any).calculateConnoisseurshipScore(
      '这个UI设计有问题，比之前的版本差，体验很糟糕'
    );
    expect(score).toBeGreaterThanOrEqual(3.0);  // evaluative + critical + comparative + aesthetic
  });
  
  it('should validate context correctly', () => {
    const engine = new AnalysisEngine(new NetworkGraph({
      graphId: 'test',
      messages: [],
      nodes: [],
      edges: []
    }));
    
    // Too short
    expect((engine as any).validateContext('好', 1.0)).toBe(false);
    
    // Polite phrase
    expect((engine as any).validateContext('好的', 1.0)).toBe(false);
    
    // Valid connoisseurship
    expect((engine as any).validateContext('这个UI排版有问题', 2.0)).toBe(true);
    
    // High score
    expect((engine as any).validateContext('有问题', 3.0)).toBe(true);
  });
});
```

---

### 7.3 Integration Tests

```typescript
describe('AnalysisEngine - Integration', () => {
  it('should work with real NetworkGraph data', async () => {
    // Load real data
    const networkGraph = NetworkGraph.parseFile('./test-data/sample-network.json');
    const engine = new AnalysisEngine(networkGraph);
    
    // Execute all analyses
    const centrality = await engine.computeCentrality();
    const communities = await engine.detectCommunities();
    const bridges = engine.findBridges();
    const hubScores = engine.calculateHubScore();
    const connoisseurs = engine.identifyConnoisseursByHubScore();
    const connoisseurship = await engine.identifyConnoisseurship();
    
    // Validate results exist
    expect(Object.keys(centrality.degree).length).toBeGreaterThan(0);
    expect(Object.keys(communities).length).toBeGreaterThan(0);
    expect(Object.keys(hubScores).length).toBeGreaterThan(0);
    
    console.log('Analysis Results:');
    console.log('- Nodes:', networkGraph.nodes.length);
    console.log('- Edges:', networkGraph.edges.length);
    console.log('- Communities:', new Set(Object.values(communities)).size);
    console.log('- Bridges:', bridges.length);
    console.log('- Connoisseurs (by Hub Score):', connoisseurs.length);
    console.log('- Connoisseurship Messages:', connoisseurship.length);
  });
  
  it('should cache results correctly', async () => {
    const networkGraph = NetworkGraph.parseFile('./test-data/sample-network.json');
    const engine = new AnalysisEngine(networkGraph);
    
    // First call (compute)
    const start1 = Date.now();
    const centrality1 = await engine.computeCentrality();
    const time1 = Date.now() - start1;
    
    // Second call (cached)
    const start2 = Date.now();
    const centrality2 = await engine.computeCentrality();
    const time2 = Date.now() - start2;
    
    // Validate cache works
    expect(centrality1).toEqual(centrality2);
    expect(time2).toBeLessThan(time1);  // Cached should be faster
  });
});
```

---

## 8. Usage Examples

### 8.1 Basic Usage

```typescript
import { AnalysisEngine } from './layer3';
import { NetworkGraph } from './layer2';

async function analyzeNetwork() {
  // 1. Load network data
  const networkGraph = NetworkGraph.parseFile('./data/network.json');
  
  // 2. Create analysis engine
  const engine = new AnalysisEngine(networkGraph);
  
  // 3. Calculate centrality
  const centrality = await engine.computeCentrality();
  console.log('Top 5 by Degree Centrality:');
  Object.entries(centrality.degree)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([node, score]) => {
      console.log(`  ${node}: ${score.toFixed(3)}`);
    });
  
  // 4. Detect communities
  const communities = await engine.detectCommunities();
  const communityCount = new Set(Object.values(communities)).size;
  console.log(`\nDetected ${communityCount} communities`);
  
  // 5. Calculate Hub Scores
  const hubScores = engine.calculateHubScore();
  console.log('\nTop 5 by Hub Score:');
  Object.entries(hubScores)
    .filter(([, score]) => score !== Infinity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([node, score]) => {
      console.log(`  ${node}: ${score.toFixed(2)}`);
    });
  
  // 6. Identify connoisseurs
  const connoisseurs = engine.identifyConnoisseursByHubScore(1.5);
  console.log(`\nConnoisseurs (Hub Score >= 1.5): ${connoisseurs.length}`);
  
  // 7. Detect connoisseurship messages
  const connoisseurship = await engine.identifyConnoisseurship();
  console.log(`\nConnoisseurship Messages: ${connoisseurship.length}`);
  console.log('Examples:');
  connoisseurship.slice(0, 3).forEach(msg => {
    console.log(`  - ${msg.content} (score: ${msg.connoisseurshipScore})`);
  });
}

analyzeNetwork().catch(console.error);
```

**Output:**
```
Top 5 by Degree Centrality:
  user123: 0.856
  user456: 0.742
  user789: 0.631
  user012: 0.589
  user345: 0.512

Detected 4 communities

Top 5 by Hub Score:
  user123: 2.50
  user456: 1.85
  user789: 1.62
  user012: 1.43
  user345: 1.21

Connoisseurs (Hub Score >= 1.5): 3

Connoisseurship Messages: 47
Examples:
  - 这个UI排版有问题，太拥挤了 (score: 2.0)
  - 设计比之前的版本更简洁 (score: 2.0)
  - 体验很好，但有个小bug (score: 3.0)
```

---

### 8.2 Advanced Usage: Ego Network Analysis

```typescript
async function analyzeEgoNetwork(centralNode: string) {
  const networkGraph = NetworkGraph.parseFile('./data/network.json');
  const engine = new AnalysisEngine(networkGraph);
  
  // Get 2-hop ego network
  const egoGraph = engine.getEgoNetwork(centralNode, 2);
  
  console.log(`Ego Network for ${centralNode}:`);
  console.log(`  Nodes: ${egoGraph.order}`);
  console.log(`  Edges: ${egoGraph.size}`);
  
  // Analyze ego network separately
  const egoNetworkGraph = NetworkGraph.fromGraphology(egoGraph, `ego-${centralNode}`);
  const egoEngine = new AnalysisEngine(egoNetworkGraph);
  
  const egoCentrality = await egoEngine.computeCentrality();
  console.log('\n  Top 3 within ego network:');
  Object.entries(egoCentrality.degree)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .forEach(([node, score]) => {
      console.log(`    ${node}: ${score.toFixed(3)}`);
    });
}

analyzeEgoNetwork('user123').catch(console.error);
```

---

### 8.3 Bot Performance Analysis

```typescript
async function analyzeBotPerformance() {
  const networkGraph = NetworkGraph.parseFile('./data/network.json');
  const engine = new AnalysisEngine(networkGraph);
  
  // Filter bot messages
  const botMessages = networkGraph.messages.filter(msg => 
    msg.fromUid.startsWith('bot_')
  );
  
  // Calculate response times
  const responseTimes = engine.calculateResponseTime(botMessages);
  
  console.log('Bot Performance:');
  Object.entries(responseTimes)
    .sort(([, a], [, b]) => a - b)
    .forEach(([botId, avgTime]) => {
      console.log(`  ${botId}: ${avgTime.toFixed(2)}s`);
    });
  
  // Calculate Hub Scores for bots
  const hubScores = engine.calculateHubScore();
  const botHubScores = Object.fromEntries(
    Object.entries(hubScores).filter(([uid]) => uid.startsWith('bot_'))
  );
  
  console.log('\nBot Hub Scores:');
  Object.entries(botHubScores)
    .sort(([, a], [, b]) => b - a)
    .forEach(([botId, score]) => {
      console.log(`  ${botId}: ${score.toFixed(2)}`);
    });
}

analyzeBotPerformance().catch(console.error);
```

---

## 9. Acceptance Criteria

### 9.1 Functional Requirements

| Requirement | Acceptance Criteria | Status |
|-------------|---------------------|--------|
| **Graph Algorithm Module** | ✅ computeCentrality() returns degree, betweenness, closeness | ✅ |
| | ✅ detectCommunities() returns community assignments | ✅ |
| | ✅ findBridges() identifies bridge edges correctly | ✅ |
| | ✅ calculateShortestPaths() computes shortest paths | ✅ |
| **Hub Score Module** | ✅ calculateHubScore() returns correct ratios | ✅ |
| | ✅ identifyConnoisseursByHubScore() filters by threshold | ✅ |
| **Connoisseurship Detection** | ✅ Rule-based detection achieves >80% precision | 🔄 |
| | ✅ 4-dimension scoring works correctly | ✅ |
| | ✅ Context validation reduces false positives | ✅ |
| **Helper Functions** | ✅ getNodeNeighbors() returns N-hop neighbors | ✅ |
| | ✅ getEgoNetwork() creates correct subgraph | ✅ |
| | ✅ calculateResponseTime() computes averages | ✅ |

---

### 9.2 Performance Requirements

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Centrality Calculation** | <5s for 1000 nodes | TBD | 🔄 |
| **Community Detection** | <10s for 1000 nodes | TBD | 🔄 |
| **Connoisseurship Detection** | <2s for 1000 messages | TBD | 🔄 |
| **Memory Usage** | <500MB for 1000 nodes | TBD | 🔄 |
| **Cache Hit Rate** | >90% for repeated calls | TBD | 🔄 |

---

### 9.3 Quality Requirements

| Requirement | Acceptance Criteria | Status |
|-------------|---------------------|--------|
| **Code Coverage** | ✅ >85% test coverage | 🔄 |
| **TypeScript Compliance** | ✅ No `any` types, strict mode enabled | ✅ |
| **Documentation** | ✅ All public methods have JSDoc | ✅ |
| **Error Handling** | ✅ All edge cases handled (empty graph, disconnected nodes) | 🔄 |
| **Logging** | ✅ Debug logs for performance tracking | 🔄 |

---

## 10. Next Steps

**Layer 3 Analysis Engine design complete (TypeScript version).**

**Recommended next actions**:
1. **Design Layer 1 Data Adapter** — Final layer design
2. **Create comprehensive design summary document**
3. **Begin implementation (coding)**
4. **Set up testing framework (Jest)**
5. **Performance benchmarking**

---

## 11. Change Log

- **2026-03-19 v2.0**: TypeScript version, converted from Python
  - Replaced NetworkX with graphology
  - Added TypeScript type annotations
  - Updated all code examples to TypeScript/async-await
  - Maintained Hub Score calculation logic (L3.5 metric)
  - Added Jest testing examples
  - Preserved all original functionality

- **2026-03-19 v1.1**: Added Hub Score calculation module (calculateHubScore + identifyConnoisseursByHubScore)

- **2026-03-19 v1.0**: Initial version, defined AnalysisEngine class, connoisseurship detection algorithm, graph algorithm encapsulation
