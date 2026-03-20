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

// Layer 5: Insight Engine (Coming in Phase 4)
// export * from './layer5/insight-engine';

// Layer 6: Visualization (Coming in Phase 5)
// export * from './layer6/dashboard';

console.log('OCTO-ONA v0.4.1 - Phase 3 Step 2 Complete ✅');
