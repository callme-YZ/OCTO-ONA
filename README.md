# OCTO-ONA: Ontology-based Context and Task Orchestration for Organizational Network Analysis

**Version**: 1.0.0 (Design Phase Complete)  
**Status**: Design Complete, Implementation Pending  
**Last Updated**: 2026-03-19

---

## 🎯 Overview

OCTO-ONA is an open-source framework for **Human-AI Collaboration Network Analysis** with a focus on:

1. **Organizational Network Analysis (ONA)** — Traditional network metrics (Degree, Betweenness, Density, etc.)
2. **Bot Performance Analysis** — Multi-label functional tagging system for AI agents
3. **Connoisseurship Value Measurement** — Quantifying human judgment impact in AI-assisted workflows

### Key Features

- ✅ **6-Layer Architecture** — Modular design from data ingestion to visualization
- ✅ **20 Metrics** — 8 Bot tags + 8 network metrics + 4 connoisseurship metrics
- ✅ **13 Diagnostic Rules** — Automated insight generation (burnout, silos, bot effectiveness)
- ✅ **Multi-Output Formats** — Web Dashboard, ChatBot, PDF, CLI, REST API
- ✅ **Extensible Adapters** — Support for any data source (DMWork, Slack, Discord, etc.)

---

## 📊 Architecture

### 6-Layer Design

```
Layer 6: Visualization          → Web Dashboard, ChatBot, PDF, CLI, API
           ↑
Layer 5: Insight Engine         → 13 Diagnostic Rules → Actionable Recommendations
           ↑
Layer 4: Metrics Calculation    → 20 Metrics (Bot Tags + Network + Connoisseurship)
           ↑
Layer 3: Analysis Engine        → Graph Algorithms + Connoisseurship Detection
           ↑
Layer 2: Data Model             → NetworkGraph (Nodes + Edges + Messages)
           ↑
Layer 1: Data Adapter           → BaseAdapter Interface + Reference Implementations
```

### Core Components

| Layer | Document | Description |
|-------|----------|-------------|
| **Layer 1** | [LAYER1-DATA-ADAPTER-v1.md](docs/LAYER1-DATA-ADAPTER-v1.md) | Data adapter interface + DMWork reference implementation |
| **Layer 2** | [LAYER2-DATA-MODEL-v1.md](docs/LAYER2-DATA-MODEL-v1.md) | Pydantic data models (HumanNode, AIAgentNode, Edge, Message, NetworkGraph) |
| **Layer 3** | [LAYER3-ANALYSIS-ENGINE-v1.md](docs/LAYER3-ANALYSIS-ENGINE-v1.md) | Graph algorithms (NetworkX) + connoisseurship detection |
| **Layer 4** | [LAYER4-METRICS-SPECIFICATION-v1.md](docs/LAYER4-METRICS-SPECIFICATION-v1.md) | Metrics overview + specifications |
| | [LAYER4-BOT-TAGS-v1.md](docs/LAYER4-BOT-TAGS-v1.md) | 8 Bot functional tags (multi-label system) |
| | [LAYER4-NETWORK-METRICS-v1.md](docs/LAYER4-NETWORK-METRICS-v1.md) | 8 Traditional ONA metrics (Degree, BC, Density, etc.) |
| | [LAYER4-CONNOISSEURSHIP-METRICS-v1.md](docs/LAYER4-CONNOISSEURSHIP-METRICS-v1.md) | 4 Connoisseurship metrics (frequency, reach, conversion, amplification) |
| **Layer 5** | [LAYER5-INSIGHT-ENGINE-v1.md](docs/LAYER5-INSIGHT-ENGINE-v1.md) | 13 diagnostic rules + insight generation |
| **Layer 6** | [LAYER6-VISUALIZATION-v1.md](docs/LAYER6-VISUALIZATION-v1.md) | 6-page Dashboard + ChatBot + multi-format output |

---

## 🔬 Metrics System

### 20 Core Metrics

#### Bot Functional Tags (8)

**P0 Network-Level Tags (5)**:
- **T1**: Cross-Team Connector (BC > 0.2 + cross-team edges)
- **T2**: Team Hub (Degree within team > team avg × 1.5)
- **T3**: Human Agent (creator's messages > bot's messages × 2)
- **T4**: Information Aggregator (In-degree > Out-degree × 1.2)
- **T5**: High Activity (message count > P75)

**P1 Individual-Level Tags (2)**:
- **T6**: Fast Responder (avg response time < 10s or < human 50%)
- **T7**: Execution-Oriented (Out-degree > In-degree × 1.5)

**P2 Specialized Tag (1)**:
- **T8**: Specialized (active channels ≤ 2 or single-channel ratio > 80%)

**Multi-Label System**: Bots can have multiple tags simultaneously.

---

#### Network Health Metrics (8)

**P0 Core Metrics (6)**:
- **L1.1**: Degree Centrality — Activity level
- **L1.2**: Betweenness Centrality — Bridge/bottleneck role
- **L1.4**: Network Density — Collaboration tightness
- **L1.5**: Leadership Distance — % of employees within 2 steps of decision-makers
- **L1.6**: Silo Index — % of weak cross-team connections
- **L1.7**: Burnout Risk — Count(BC > 0.3)

**P1 Supplementary Metrics (2)**:
- **L1.3**: Closeness Centrality — Information reach
- **L1.8**: Bottleneck Risk — Single point of failure count

---

#### Connoisseurship Metrics (4)

**P0 Core Metrics (3)**:
- **L3.1**: Connoisseurship Frequency (CF) — % of messages that are connoisseurship
- **L3.2**: Connoisseurship Reach (CR) — % of network reached by connoisseurship
- **L3.3**: Connoisseurship Conversion (CC) — % of connoisseurship that led to execution

**P1 Enhancement Metric (1)**:
- **L3.4**: Connoisseurship Amplification (CA) — Rebroadcast ratio

**Connoisseurship Definition**: Professional judgment/feedback messages identified via 4-dimension rule-based algorithm:
1. Evaluative (good/bad)
2. Critical (problem/error)
3. Comparative (better/worse)
4. Aesthetic (experience/design)

---

## 🔍 Diagnostic Rules (Layer 5)

### 13 Rules Across 4 Categories

#### Network Health (3)
- **SILO_CRITICAL**: Silo Index > 15%
- **DENSITY_LOW**: Network Density < 0.3
- **LEADERSHIP_DISTANCE_FAR**: < 70% within 2 steps of leadership

#### Burnout Risk (2)
- **BURNOUT_CRITICAL**: > 5% employees with BC > 0.3
- **BOTTLENECK_CRITICAL**: Bottleneck nodes detected

#### Bot Effectiveness (3)
- **BOT_UNDERUTILIZED**: > 30% bots below P25 activity
- **BOT_NO_CROSS_TEAM**: Silos exist but no cross-team bots
- **BOT_LACK_DIVERSITY**: < 4 functional tag categories covered

#### Connoisseurship (3)
- **CONNOISSEURSHIP_LOW_CONVERSION**: Conversion rate < 30%
- **CONNOISSEURSHIP_MISSING**: < 3 connoisseurs identified
- **CONNOISSEURSHIP_LOW_REACH**: Average reach < 20%

#### Composite Rules (2)
- **COLLABORATION_IMBALANCE**: H2B ratio > 70% or < 30%
- **CONNOISSEURSHIP_EXECUTION_GAP**: High frequency + low conversion

---

## 🎨 Visualization (Layer 6)

### 5 Output Formats

1. **Web Dashboard** (Primary)
   - 6-page interactive UI (Overview, Bot Analytics, Network Health, Connoisseurship, Insights, Network Graph)
   - Tech stack: Vue 3 + ECharts 5.x + Element Plus

2. **ChatBot** (Auxiliary)
   - Embedded in Dashboard (bottom-right)
   - 24 pre-defined queries (quick lookup + navigation + metric explanations)
   - Rule-based (simple) or LLM-enhanced (advanced)

3. **PDF Report** (Sharing)
   - 5-10 pages, A4 size, 300 DPI
   - Generated via Matplotlib + ReportLab

4. **CLI Output** (Quick View)
   - Terminal-friendly tables (Rich/Tabulate)
   - ASCII charts (plotille)

5. **REST API** (Integration)
   - Endpoints: `/api/v1/reports`, `/api/v1/metrics`, `/api/v1/insights`, `/api/v1/network/graph`

---

## 🚀 Quick Start

### Installation (Not Yet Implemented)

```bash
pip install octo-ona
```

### Basic Usage (Planned)

```python
from octo_ona import DMWorkAdapter, AnalysisEngine, MetricsCalculator, InsightEngine
from datetime import datetime

# 1. Extract data
config = {
    'host': 'your-db-host',
    'user': 'your-user',
    'password': 'your-password',
    'database': 'im',
    'platform': 'dmwork'
}

adapter = DMWorkAdapter(config)
network_graph = adapter.to_network_graph(
    start_time=datetime(2026, 3, 1),
    end_time=datetime(2026, 3, 18)
)

# 2. Analyze
engine = AnalysisEngine(network_graph)
analysis_results = {
    'centrality': engine.compute_centrality(),
    'connoisseurship_messages': engine.identify_connoisseurship()
}

# 3. Calculate metrics
calculator = MetricsCalculator(network_graph, analysis_results)
metrics = calculator.calculate_all()

# 4. Generate insights
insight_engine = InsightEngine(rules=default_rules)
insights = insight_engine.generate_insights(metrics)

# 5. Output
print(insights.to_markdown())
```

### Web Dashboard (Planned)

```bash
octo-ona serve --port 8080
# Visit http://localhost:8080
```

---

## 📖 Documentation

### Design Documents

- [ARCHITECTURE-DESIGN-v1.md](docs/ARCHITECTURE-DESIGN-v1.md) — Overall 6-layer architecture
- [LAYER1-DATA-ADAPTER-v1.md](docs/LAYER1-DATA-ADAPTER-v1.md) — Data adapter interface
- [LAYER2-DATA-MODEL-v1.md](docs/LAYER2-DATA-MODEL-v1.md) — Pydantic data models
- [LAYER3-ANALYSIS-ENGINE-v1.md](docs/LAYER3-ANALYSIS-ENGINE-v1.md) — Analysis engine
- [LAYER4-METRICS-SPECIFICATION-v1.md](docs/LAYER4-METRICS-SPECIFICATION-v1.md) — Metrics overview
- [LAYER4-BOT-TAGS-v1.md](docs/LAYER4-BOT-TAGS-v1.md) — Bot functional tags
- [LAYER4-NETWORK-METRICS-v1.md](docs/LAYER4-NETWORK-METRICS-v1.md) — Network metrics
- [LAYER4-CONNOISSEURSHIP-METRICS-v1.md](docs/LAYER4-CONNOISSEURSHIP-METRICS-v1.md) — Connoisseurship metrics
- [LAYER5-INSIGHT-ENGINE-v1.md](docs/LAYER5-INSIGHT-ENGINE-v1.md) — Insight engine
- [LAYER6-VISUALIZATION-v1.md](docs/LAYER6-VISUALIZATION-v1.md) — Visualization

---

## 🛠️ Extending OCTO-ONA

### Custom Data Adapter

```python
from octo_ona.layer1 import BaseAdapter

class MyCustomAdapter(BaseAdapter):
    def fetch_users(self):
        # Your implementation
        pass
    
    def fetch_messages(self, start_time, end_time):
        # Your implementation
        pass
```

### Custom Diagnostic Rule

```python
from octo_ona.layer5 import DiagnosticRule

custom_rule = DiagnosticRule(
    id="MY_RULE",
    name="My Custom Rule",
    category="custom",
    severity="warning",
    condition=lambda metrics: metrics.get('my_metric') > 100,
    description="Custom problem detected",
    recommendations=["Do something"],
    related_metrics=["L1.1"],
    priority=5
)
```

---

## 🎯 Use Cases

### 1. Team Health Monitoring

- Identify burnout risks (BC > 0.3)
- Detect silos (cross-team weak connections)
- Measure collaboration density

### 2. Bot Performance Optimization

- Tag bot functions (8 dimensions)
- Identify underutilized bots (< P25 activity)
- Recommend bot deployment (cross-team connectors)

### 3. Connoisseurship Value Measurement

- Identify key connoisseurs (frequency > 30%)
- Measure judgment impact (conversion rate)
- Track knowledge amplification (rebroadcast ratio)

### 4. Research & Publication

- Analyze human-AI collaboration patterns
- Validate connoisseurship value hypothesis
- Generate publication-ready visualizations

---

## 📊 Case Study: Octo Team Analysis

**Period**: 2026-03-01 to 2026-03-18 (16 days)  
**Data**: 33,770 messages, 15 nodes (7 humans + 8 bots), 194 edges

**Key Findings**:
- **Burnout Risk**: 3 employees (42.9%) with BC > 0.3
- **Connoisseurship Gap**: High frequency (65.2%) but low conversion (18.3%)
- **Silo Index**: 12.5% (warning level)
- **Top Bot**: wuyun_bot (1,425 messages, 5 functional tags)

**Recommendations**:
1. Deploy human-agent bot for 嘉伟 (BC=0.45)
2. Establish connoisseurship→Issue automation
3. Deploy cross-team connector bots

**Report**: [Generated HTML Dashboard](https://example.com/octo-ona-report.html)

---

## 🗺️ Roadmap

### Phase 1: Core Implementation (6 weeks)

- [ ] Layer 1: DMWork adapter
- [ ] Layer 2: Data models (Pydantic)
- [ ] Layer 3: Analysis engine (NetworkX + rule-based connoisseurship)
- [ ] Layer 4: Metrics calculation (P0 metrics)

### Phase 2: Insight & Visualization (6 weeks)

- [ ] Layer 5: Insight engine (13 rules)
- [ ] Layer 6: Web Dashboard (Page 1 + Page 5)
- [ ] CLI output
- [ ] PDF export

### Phase 3: Advanced Features (6 weeks)

- [ ] LLM-enhanced connoisseurship detection
- [ ] ChatBot (24 pre-defined queries)
- [ ] Full 6-page Dashboard
- [ ] REST API

### Phase 4: Ecosystem (Ongoing)

- [ ] Slack/Discord adapters
- [ ] Custom rule marketplace
- [ ] Plugin system
- [ ] Community contributions

---

## 🤝 Contributing

OCTO-ONA is an open-source project. Contributions are welcome!

**Current Status**: Design phase complete, implementation not started.

**How to Contribute**:
1. Review design documents
2. Suggest improvements (open GitHub issues)
3. Implement features (PRs welcome after v1.0 release)

---

## 📜 License

MIT License (Planned)

---

## 📞 Contact

- **Project Lead**: YZ (张旭) - zhangxu@mininglamp.com
- **GitHub**: https://github.com/callme-YZ/OCTO-ONA
- **Documentation**: [Design Documents](.)

---

## 🙏 Acknowledgments

- **OpenClaw**: Infrastructure for agent orchestration
- **NetworkX**: Graph analysis library
- **ECharts**: Visualization library
- **Octo Team**: Real-world data source and use case

---

**Design Status**: ✅ Complete (2026-03-19)  
**Implementation Status**: ⏸️ Pending  
**Documentation**: 10 design documents, ~120KB total

---

_Generated by OCTO-ONA Design Team, 2026-03-19_
