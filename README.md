# OCTO-ONA

**Organizational Network Analysis** framework for **Human-AI collaboration**.

## Features

- 🎯 **21 Metrics**: Bot tags (8) + Network metrics (8) + Connoisseurship metrics (5)
- 🤖 **Human-AI ONA**: Specialized for analyzing human-bot collaboration networks
- 📊 **Dashboard**: Interactive visualization with ECharts
- 🔌 **Pluggable Adapters**: DMWork, Discord, GitHub, and custom data sources

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run example
npm run dev
```

## Architecture

6-layer design:

1. **Layer 1**: Data Adapter (DMWork, Discord, GitHub)
2. **Layer 2**: Data Model (zod schemas)
3. **Layer 3**: Analysis Engine (graphology + Hub Score)
4. **Layer 4**: Metrics Calculator (21 metrics)
5. **Layer 5**: Insight Engine (13 diagnostic rules)
6. **Layer 6**: Visualization (Dashboard + PDF + CLI)

## Documentation

See `/docs` directory for detailed design documents.

## License

MIT
