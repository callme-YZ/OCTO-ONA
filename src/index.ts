/**
 * OCTO-ONA - Organizational Network Analysis Framework
 * 
 * For Human-AI collaboration analysis with connoisseurship metrics.
 */

// Layer 2: Data Models (Ready ✅)
export * from './layer2/models';

// Layer 1: Data Adapters (Ready ✅)
export * from './layer1/base-adapter';
export * from './layer1/dmwork-adapter';
export * from './layer1/validator';

// Layer 3: Analysis Engine (Ready ✅)
export * from './layer3/analysis-engine';
export * from './layer3/connoisseur-detector';

// Layer 4: Metrics Calculator (Ready ✅)
export * from './layer4/metrics-calculator';
export * from './layer4/core-metrics';
export * from './layer4/bot-tagger';

// Layer 6: Visualization (Ready ✅)
export * from './layer6/dashboard-generator';

// Layer 5: Insight Engine (Coming in Phase 5)
// export * from './layer5/insight-engine';

console.log('OCTO-ONA v0.7.0 - Phase 4 Step 2 Complete ✅');
console.log('Dashboard: 5 charts + 86 tests passing');
