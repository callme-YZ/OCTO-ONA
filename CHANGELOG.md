# Changelog

All notable changes to OCTO-ONA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
