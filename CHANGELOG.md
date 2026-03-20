# Changelog

All notable changes to OCTO-ONA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.5] - 2026-03-20

### Added
- 📥 **Excel Template Generator** — Download pre-formatted Excel template
- 📤 **Excel File Import** — Upload filled template for analysis
- 📊 **3-Sheet Template** — Users, Messages, Instructions
- 🎨 **Formatted Template** — Color-coded headers, example data
- 📝 **Detailed Instructions** — In-template user guide

### Changed
- 🌐 **Web UI Enhancement** — Excel option in platform selector
- 🔄 **File Upload Support** — Multer integration (10MB limit)
- 🗑️ **Auto Cleanup** — Uploaded files deleted after analysis

### Technical
- `src/layer1/adapters/excel-template.ts` (250 lines) — Template generator
- `src/layer1/adapters/excel-adapter.ts` (240 lines) — Excel parser
- Updated `config-server.ts` — Template download + file upload routes
- Updated Web UI (HTML/JS/CSS) — Excel configuration panel
- New dependency: multer@1.4.5-lts.1
- 127/127 tests passing (100%)

### Use Cases
- ✅ Users without database access
- ✅ Manual data collection (meetings, emails)
- ✅ Small-scale testing (<100 people)
- ✅ Cross-platform data fusion

### Security
- ✅ File size limit (10MB)
- ✅ File type validation (.xlsx only)
- ✅ Auto cleanup after analysis
- ✅ No permanent storage

### Example Workflow
1. Download template: Click "📥 Download Excel Template"
2. Fill data: Users sheet + Messages sheet
3. Upload: Select filled .xlsx file
4. Analyze: Click "🚀 Run Analysis"
5. View: Dashboard generated automatically

---

## [1.1.4] - 2026-03-20

### Added
- 🔌 **OCTO Adapter** — Connect to OCTO Internal IM platform (DMWork backend)
- 💾 **Direct database connection** — MySQL support with 5-table sharding
- 🌐 **Web UI integration** — OCTO platform available in configuration wizard
- 🌍 **Multi-language OCTO support** — Chinese and English labels for database fields

### Changed
- 📝 **Secure configuration** — No hardcoded server addresses or credentials
- 🔒 **Environment variable support** — Optional config via OCTO_DB_* variables
- 📚 **Updated language packs** — Added OCTO-specific translations (en.json, zh.json)

### Technical
- `src/layer1/adapters/octo-adapter.ts` (270 lines) — New OCTO adapter
- Updated `config-server.ts` — Added OCTO route support
- Updated Web UI (HTML/JS/CSS) — OCTO configuration form
- 127/127 tests passing (100%)

### Security
- ✅ No hardcoded credentials in code
- ✅ No real server addresses in examples
- ✅ User must provide all connection parameters
- ✅ Supports environment variables for automation

### Documentation
- README updated with OCTO adapter usage
- Example configuration for database connection

---

## [1.1.3] - 2026-03-20

### Added
- 🚀 **One-command startup** — `npm run start:ui` to launch Web UI
- 📝 **Simplified README** — "Fastest Way to Get Started" section
- 🔧 **Development mode** — `npm run dev:ui` with auto-reload
- 📦 **Auto-copy static files** — `npm run build` now includes Web UI assets

### Changed
- ✨ **Improved user experience** — No more manual file copying
- 📚 **Updated documentation** — Clearer installation instructions

### Fixed
- 🐛 **Static file 404 errors** — Fixed missing HTML/CSS/JS/JSON in dist/
- 🔨 **Build script** — Now copies `src/web-ui/public/*` to `dist/web-ui/public/`

### Developer Notes
This release focuses on improving the installation and startup experience based on user feedback. Users can now start the Web UI with a single command instead of complex npx commands.

---

## [1.1.2] - 2026-03-20

### Added
- 🌍 **Multi-language support** — English and Simplified Chinese
- 🔄 **Language switcher** — Toggle between 🇬🇧 EN and 🇨🇳 中文
- 💾 **Preference persistence** — Language choice saved to localStorage

### Technical
- Lightweight i18n system (no dependencies)
- JSON language packs (`en.json`, `zh.json`)
- ~100 lines of new code

---

## [1.1.1] - 2026-03-20

### Added
- ✅ **Technical debt cleanup** — NetworkGraphBuilder unit tests
- ✅ **Exporter tests** — Mock tests for PDF/Excel/Image exporters
- 📚 **Documentation updates** — README.md extended with v1.1 features

### Fixed
- 🧪 **Test coverage** — 127/127 tests passing (100%)

---

## [1.1.0] - 2026-03-20

### Added
- 🌐 **Web Configuration UI** — Visual interface for non-technical users
- 🔌 **Discord Adapter** — Extract network data from Discord servers
- 🔌 **GitHub Adapter** — Analyze GitHub repository collaboration
- 📊 **PDF Export** — Generate professional analysis reports
- 📊 **Excel Export** — Export metrics to spreadsheet
- 📊 **PNG Export** — Save network graphs as images
- 🔗 **REST API** — HTTP endpoints for programmatic access

### Changed
- ♻️ **BaseAdapter refactored** — Minimal interface + helper utilities
- 🏗️ **NetworkGraphBuilder** — Reusable graph construction tool

### Technical
- 583 lines Web UI code
- 836 lines adapter code
- 995 lines export code
- 127 tests (100% passing)

---

## [1.0.0-beta] - 2026-03-20

### Added
- 🎉 **Initial release** — Complete ONA framework
- 📊 **15 core metrics** — Network, collaboration, connoisseurship
- 🤖 **5 bot functional tags** — T1-T5 classification
- 🏆 **Hub Score** — Connoisseurship measurement
- 🎨 **Interactive Dashboard** — ECharts visualization
- 🔌 **DMWork Adapter** — Built-in data source support
- 📚 **Comprehensive documentation** — 9,879 lines (EN + ZH)
- 🧪 **Full test coverage** — 92/92 tests passing

### Performance
- Small networks (<15 nodes): <0.1s (100x faster than target)
- Medium networks (50 nodes): ~0.03s (1000x faster)
- Large networks (200 nodes): ~0.02s (6000x faster)
- Memory usage: <30MB

---

## Legend

- 🎉 Major feature
- ✨ Enhancement
- 🐛 Bug fix
- 📚 Documentation
- 🔧 Configuration
- 🧪 Testing
- ♻️ Refactoring
- 🔒 Security
- 🌍 Internationalization
- 🚀 Performance
