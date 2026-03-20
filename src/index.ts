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

// Layer 4: Metrics Calculator (Coming in Phase 3)
// export * from './layer4/metrics-calculator';

console.log('OCTO-ONA v0.3.0 - Phase 2 Step 3 Complete ✅');
