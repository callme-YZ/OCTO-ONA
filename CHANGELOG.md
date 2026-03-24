# Changelog

All notable changes to OCTO-ONA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-24

### Added

#### Database Infrastructure
- **Local database schema v2.0** (#14)
  - 17 tables + 5 views for multi-source data caching
  - Support for Discord, DMWork, GitHub data sources
  - Metrics metadata tables (categories, formulas, parameters)
  - Analysis results caching with version tracking

- **LocalDatabase class** (#15)
  - Complete CRUD API for all tables
  - Connection pooling and transaction support
  - Type-safe operations with TypeScript
  - 12 unit tests covering all operations

#### Data Synchronization
- **OCTOAdapter multi-mode support** (#16)
  - `remote` mode: Direct remote DB access (legacy)
  - `local` mode: Read from local cache (offline-capable)
  - `sync` mode: Sync remote → local (incremental/full)
  - 5 unit tests for all modes

- **CLI sync command** (#18)
  - `octo-ona sync <source_id>` for data synchronization
  - Incremental sync based on `last_sync_at`
  - Time range filters (`--start-time`, `--end-time`)
  - Verbose logging (`--verbose`)
  - Configuration from files or environment variables

#### Metrics Engine
- **Seed metrics data** (#19)
  - 10 P0 metrics pre-seeded in database
  - 4 metric categories (network, collaboration, connoisseurship, bot_tag)
  - Configurable parameters (L3.3: window_minutes, T5: percentile)
  - Changelog tracking for all metrics
  - 8 verification tests

- **MetricsEngine class** (#20)
  - Dynamic metric loading from database
  - 4 formula types: graphology, custom, SQL, JavaScript
  - Parameter validation (type, min/max)
  - Result caching to `analysis_results` table
  - 12 unit tests

- **MetricsCalculator v2** (#21)
  - Database-driven metric calculation
  - v1 API backward compatibility
  - Hybrid mode (DB-first, legacy fallback)
  - Seamless migration path from v1 → v2
  - 11 unit tests (v1, v2, hybrid modes)

#### Testing & Validation
- **E2E workflow test** (#24)
  - Complete workflow: insert data → build graph → calculate metrics → export
  - Validation of all 10 P0 metrics
  - Export to JSON and CSV formats
  - 2 comprehensive integration tests

### Changed
- **Metric definitions** moved from hardcoded TypeScript to database
- **OCTOAdapter** refactored to support local caching
- **MetricsCalculator** refactored to use MetricsEngine

### Fixed
- **OCTOAdapter**: Broadcast logic now uses all users instead of invalid channel_id node (#24)
- **MetricsCalculator**: Added missing `await` for async result conversion (#24)

### Technical Improvements
- **Test coverage**: 54 tests (all passing)
  - Database: 26 tests
  - Adapters: 5 tests
  - Metrics: 23 tests
- **Type safety**: Full TypeScript support with strict types
- **Documentation**: README updated with CLI usage examples

### Migration Guide

#### For existing users (v1.x → v2.0):

**Step 1: Install dependencies**
```bash
npm install
```

**Step 2: Set up local database**
```bash
# Install MySQL (if not already)
brew install mysql

# Create database
mysql -u root -e "CREATE DATABASE octo_ona CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run schema
mysql -u root octo_ona < schema-v2.sql

# Seed metrics
mysql -u root octo_ona < seed-metrics.sql
```

**Step 3: Configure database connections**

Create `octo-ona.config.json`:
```json
{
  "host": "localhost",
  "port": 3306,
  "user": "root",
  "password": "",
  "database": "octo_ona"
}
```

Create `octo-remote.config.json` (add to .gitignore):
```json
{
  "host": "your-remote-host",
  "port": 13306,
  "user": "readonly",
  "password": "your-password",
  "database": "im"
}
```

**Step 4: Sync data**
```bash
npx octo-ona sync dmwork-octo
```

**Step 5: Update code (optional, for backward compatibility)**

Old v1 code still works:
```typescript
const calc = new MetricsCalculator(graph);
calc.registerMetrics(METRICS);
const results = await calc.calculateAll();
```

New v2 code (recommended):
```typescript
const db = new LocalDatabase(config);
const calc = new MetricsCalculator(graph, db);
const results = await calc.calculateAll(); // Auto-loads from DB
```

### Breaking Changes
None. v1 API is fully backward compatible.

### Deprecated
- Direct remote database access mode will be removed in v3.0 (use `sync` + `local` modes instead)

### Known Issues
- Unicode characters in metric names may display incorrectly if MySQL connection charset is not UTF-8 (set `charset=utf8mb4` in connection config)

---

## [1.3.0] - 2026-03-17

### Added
- Basic ONA metrics implementation (P0 metrics)
- Network graph visualization
- Excel export functionality

---

## [1.2.0] - 2026-03-10

### Added
- Discord adapter
- GitHub adapter
- Core analysis engine

---

## [1.1.5] - 2026-03-01

### Added
- Initial OCTO adapter
- Basic network graph model

---

[2.0.0]: https://github.com/callme-YZ/OCTO-ONA/compare/v1.3.0...v2.0.0
[1.3.0]: https://github.com/callme-YZ/OCTO-ONA/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/callme-YZ/OCTO-ONA/compare/v1.1.5...v1.2.0
[1.1.5]: https://github.com/callme-YZ/OCTO-ONA/releases/tag/v1.1.5
