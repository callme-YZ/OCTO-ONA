# OCTO-ONA API Reference

[English](#english) | [中文](#中文)

---

## English

### Layer 1: Data Adapters

#### BaseAdapter

Abstract base class for data adapters.

```typescript
abstract class BaseAdapter {
  abstract connect(config: AdapterConfig): Promise<void>;
  abstract extractNetwork(options: ExtractionOptions): Promise<NetworkGraph>;
  abstract disconnect(): Promise<void>;
}
```

**Methods:**
- `connect(config)` — Establish connection to data source
- `extractNetwork(options)` — Extract network data
- `disconnect()` — Close connection and cleanup

#### DMWorkAdapter

DMWork database adapter (extends BaseAdapter).

```typescript
class DMWorkAdapter extends BaseAdapter {
  constructor();
  connect(config: DMWorkConfig): Promise<void>;
  extractNetwork(options: DMWorkOptions): Promise<NetworkGraph>;
  disconnect(): Promise<void>;
}
```

**DMWorkConfig:**
```typescript
interface DMWorkConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}
```

**DMWorkOptions:**
```typescript
interface DMWorkOptions {
  startTime: Date;
  endTime: Date;
  channelIds?: string[];
  userIds?: string[];
}
```

#### DataValidator

Validates NetworkGraph data.

```typescript
class DataValidator {
  validate(graph: NetworkGraph, options?: ValidationOptions): ValidationReport;
}
```

**ValidationReport:**
```typescript
interface ValidationReport {
  passed: boolean;
  issues: ValidationIssue[];
  summary: {
    total_checks: number;
    critical_count: number;
    error_count: number;
    warning_count: number;
    info_count: number;
  };
}
```

---

### Layer 2: Data Models

#### NetworkGraph

Core data structure.

```typescript
interface NetworkGraph {
  graph_id: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  human_nodes: HumanNode[];
  ai_agent_nodes: AIAgentNode[];
  edges: Edge[];
  messages?: Message[];
  summary: NetworkSummary;
  created_at: Date;
  version: string;
}
```

#### HumanNode

```typescript
interface HumanNode {
  id: string;
  name?: string;
  type: 'human';
  team?: string;
  role?: string;
}
```

#### AIAgentNode

```typescript
interface AIAgentNode {
  id: string;
  bot_name: string;
  type: 'ai_agent';
  capabilities: string[];
  functional_tags: BotTag[];
  creator_uid?: string;
}
```

---

**See full documentation in repository for complete API reference.**

**Version:** 1.0  
**Last Updated:** 2026-03-20
