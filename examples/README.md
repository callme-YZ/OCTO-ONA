# OCTO-ONA Examples

## Basic Usage

### 1. DMWork Basic Extraction

Extract complete network from DMWork database:

```bash
npx ts-node examples/dmwork-basic.ts
```

Output: `dmwork-network.json`

### 2. DMWork Filtered Extraction (OCTO Team)

Extract OCTO team subnetwork using UID whitelist:

```bash
npx ts-node examples/dmwork-filtered.ts
```

Output: `octo-network.json`

## Configuration

DMWork database connection:

```typescript
const config = {
  host: 'im-test.xming.ai',
  port: 13306,
  user: 'dmwork_ro',
  password: 'dmwork_ro',
  database: 'im',
  platform: 'dmwork',
};
```

## UID Whitelist

Load UIDs from mapping file:

```typescript
import fs from 'fs/promises';

const mapping = JSON.parse(
  await fs.readFile('octo-team-uid-mapping.json', 'utf-8')
);

const uids = mapping.members.map((m: any) => m.uid);
```

## Time Range Filter

```typescript
const graph = await adapter.toNetworkGraph({
  startTime: new Date('2026-03-01'),
  endTime: new Date('2026-03-18'),
});
```

## Channel Filter

```typescript
const graph = await adapter.toNetworkGraph({
  channelIds: ['channel_001', 'channel_002'],
});
```

## Combined Filters

```typescript
const graph = await adapter.toNetworkGraph({
  startTime: new Date('2026-03-01'),
  endTime: new Date('2026-03-18'),
  uidWhitelist: octoUids,
  channelIds: ['product_team'],
  graphId: 'octo_product_2026_03',
});
```

## Data Validation

### Run Validation

```bash
npx ts-node examples/validation-demo.ts
```

### Validation Checks (7 total)

1. **Node Count** — Detects 0 nodes or unexpectedly few
2. **Message Count** — Detects missing data (table sharding issue)
3. **Edge Count** — Detects isolated nodes
4. **Core Member Presence** — Verifies UID whitelist members exist
5. **Message Distribution** — Detects inactive nodes
6. **Edge Consistency** — Detects orphan edges (missing nodes)
7. **Time Range** — Warns if <7 days (ONA recommendation)

### Validation Levels

- 🔴 **CRITICAL** — Stops analysis (e.g., 0 nodes/messages)
- ❌ **ERROR** — Major issue (e.g., data <10% expected)
- ⚠️ **WARNING** — Minor issue (e.g., sparse network)
- ℹ️ **INFO** — Informational (e.g., some nodes silent)

### Example Output

```
=== Data Validation Report ===

Status: ✅ PASSED

Checks: 7
Critical: 0
Errors: 0
Warnings: 1
Info: 1

Issues:

⚠️ [TIME_RANGE_SHORT] Time range: 0.5 days (recommend ≥7)
   💡 ONA typically needs ≥7 days for meaningful analysis.

ℹ️ [NODES_NO_MESSAGES] 3 nodes sent 0 messages

```

### Programmatic Usage

```typescript
import { DataValidator } from '../src/layer1/validator';

const validator = new DataValidator();
const report = validator.validate(graph, {
  expectedNodes: 15,
  expectedMessages: 30000,
  uidWhitelist: octoUids,
  minMessagesPerNode: 10,
});

if (!report.passed) {
  console.error('Validation failed!');
  process.exit(1);
}
```
