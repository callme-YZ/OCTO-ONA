/**
 * End-to-End Demo
 * 
 * Demonstrates complete pipeline: Data → Analysis → Metrics → Dashboard
 */

import * as path from 'path';
import { createEmptyGraph } from '../src/layer2/models';
import { DMWorkAdapter } from '../src/layer1/dmwork-adapter';
import { DataValidator } from '../src/layer1/validator';
import { AnalysisEngine } from '../src/layer3/analysis-engine';
import { MetricsCalculator } from '../src/layer4/metrics-calculator';
import { ALL_CORE_METRICS } from '../src/layer4/core-metrics';
import { DashboardGenerator } from '../src/layer6/dashboard-generator';

async function main() {
  console.log('🚀 OCTO-ONA End-to-End Demo\n');
  
  // ============================================
  // Step 1: Data Extraction (Simulated)
  // ============================================
  console.log('Step 1: Data Extraction...');
  
  // In real scenario, use DMWorkAdapter with database config
  // For demo, we'll use synthetic data from dashboard-demo
  const { demoGraph } = require('./dashboard-demo-data');
  
  console.log(`✅ Extracted: ${demoGraph.summary.total_nodes} nodes, ${demoGraph.summary.total_messages} messages\n`);
  
  // ============================================
  // Step 2: Data Validation
  // ============================================
  console.log('Step 2: Data Validation...');
  
  const validator = new DataValidator();
  const validationResult = validator.validate(demoGraph);
  
  if (!validationResult.passed) {
    console.error('❌ Validation failed:', validationResult.issues.filter(i => i.level === 'critical' || i.level === 'error'));
    process.exit(1);
  }
  
  console.log(`✅ Validation passed: ${validationResult.summary.warning_count} warnings\n`);
  
  // ============================================
  // Step 3: Network Analysis
  // ============================================
  console.log('Step 3: Network Analysis...');
  
  const engine = new AnalysisEngine(demoGraph);
  const centrality = await engine.computeCentrality();
  
  console.log(`✅ Centrality computed: ${Object.keys(centrality.degree).length} nodes\n`);
  
  // ============================================
  // Step 4: Metrics Calculation
  // ============================================
  console.log('Step 4: Metrics Calculation...');
  
  const calculator = new MetricsCalculator(demoGraph);
  calculator.registerMetrics(ALL_CORE_METRICS);
  
  const metrics = await calculator.calculateAll('P0');
  
  console.log(`✅ Calculated ${metrics.length} metrics\n`);
  
  // Display sample metrics
  const hubScoreMetric = metrics.find(m => m.metricId === 'L3.5');
  if (hubScoreMetric && typeof hubScoreMetric.value === 'object') {
    console.log('Sample: Hub Score Rankings');
    const scores = hubScoreMetric.value as Record<string, number>;
    const sorted = Object.entries(scores)
      .sort((a, b) => {
        if (a[1] === Infinity && b[1] === Infinity) return 0;
        if (a[1] === Infinity) return -1;
        if (b[1] === Infinity) return 1;
        return b[1] - a[1];
      })
      .slice(0, 5);
    
    for (const [id, score] of sorted) {
      const name = demoGraph.human_nodes.find((h: any) => h.id === id)?.name ||
                   demoGraph.ai_agent_nodes.find((b: any) => b.id === id)?.bot_name ||
                   id;
      console.log(`  ${name}: ${score === Infinity ? '∞' : score.toFixed(2)}`);
    }
    console.log();
  }
  
  // ============================================
  // Step 5: Dashboard Generation
  // ============================================
  console.log('Step 5: Dashboard Generation...');
  
  const generator = new DashboardGenerator(demoGraph);
  const outputPath = './e2e-dashboard.html';
  
  await generator.generate(outputPath);
  
  console.log(`✅ Dashboard generated: ${outputPath}\n`);
  
  // ============================================
  // Summary
  // ============================================
  console.log('═══════════════════════════════════════');
  console.log('🎉 End-to-End Demo Complete!');
  console.log('═══════════════════════════════════════');
  console.log(`📊 Dashboard: ${outputPath}`);
  console.log(`📈 Metrics: ${metrics.length} calculated`);
  console.log(`🌐 Network: ${demoGraph.summary.total_nodes} nodes, ${demoGraph.summary.total_edges} edges`);
  console.log('═══════════════════════════════════════\n');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
