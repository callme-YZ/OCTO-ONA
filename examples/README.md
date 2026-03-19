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
