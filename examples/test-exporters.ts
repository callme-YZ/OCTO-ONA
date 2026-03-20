/**
 * Manual Exporter Verification Script
 * 
 * Tests PDF, Excel, and PNG exporters with real data.
 */

import fs from 'fs';
import { NetworkGraphBuilder } from '../src/layer1/network-graph-builder';
import { MetricsCalculator, getStructuredMetrics } from '../src/layer4/metrics-calculator';
import { PDFExporter } from '../src/layer6/pdf-exporter';
import { ExcelExporter } from '../src/layer6/excel-exporter';
import { ImageExporter } from '../src/layer6/image-exporter';

async function main() {
  console.log('🧪 Starting Exporter Verification...\n');
  
  // Create sample network
  const graph = NetworkGraphBuilder.build({
    graphId: 'test-export',
    description: 'Test Export Network',
    startTime: new Date('2026-01-01'),
    endTime: new Date('2026-01-10'),
    humans: [
      { id: 'h1', name: 'Alice', type: 'human', team: 'team-a' },
      { id: 'h2', name: 'Bob', type: 'human', team: 'team-a' },
      { id: 'h3', name: 'Charlie', type: 'human', team: 'team-b' },
    ],
    bots: [
      { id: 'b1', type: 'ai_agent', bot_name: 'Bot1', capabilities: ['chat'], functional_tags: [] },
    ],
    edges: [
      {
        source: 'h1',
        target: 'h2',
        edge_type: 'H2H',
        weight: 5,
        is_cross_team: false,
        message_ids: ['m1', 'm2'],
      },
      {
        source: 'h1',
        target: 'b1',
        edge_type: 'H2B',
        weight: 3,
        is_cross_team: false,
        message_ids: ['m3'],
      },
    ],
    messages: [
      { id: 'm1', from_uid: 'h1', to_uids: ['h2'], content: 'Hello', timestamp: new Date('2026-01-01') },
      { id: 'm2', from_uid: 'h1', to_uids: ['h2'], content: 'World', timestamp: new Date('2026-01-02') },
      { id: 'm3', from_uid: 'h1', to_uids: ['b1'], content: 'Hi Bot', timestamp: new Date('2026-01-03') },
    ],
  });
  
  // Calculate metrics
  const calculator = new MetricsCalculator(graph);
  const results = await calculator.calculateAll('P0');
  const metrics = getStructuredMetrics(graph, results);
  
  console.log('✅ Sample data created:');
  console.log(`   - ${graph.summary.total_nodes} nodes (${graph.summary.total_humans} humans, ${graph.summary.total_bots} bots)`);
  console.log(`   - ${graph.summary.total_edges} edges`);
  console.log(`   - ${graph.summary.total_messages} messages\n`);
  
  // Test PDF Export
  try {
    console.log('📄 Testing PDF Export...');
    const pdfExporter = new PDFExporter();
    const pdfBuffer = await pdfExporter.generate(graph, metrics, {
      title: 'Test ONA Report',
      author: 'Mayo',
    });
    
    fs.writeFileSync('test-report.pdf', pdfBuffer);
    const pdfSize = (pdfBuffer.length / 1024).toFixed(2);
    console.log(`   ✅ PDF generated: test-report.pdf (${pdfSize} KB)\n`);
  } catch (error: any) {
    console.error(`   ❌ PDF export failed: ${error.message}\n`);
  }
  
  // Test Excel Export
  try {
    console.log('📊 Testing Excel Export...');
    const excelExporter = new ExcelExporter();
    const excelBuffer = await excelExporter.export(metrics);
    
    fs.writeFileSync('test-metrics.xlsx', excelBuffer);
    const excelSize = (excelBuffer.length / 1024).toFixed(2);
    console.log(`   ✅ Excel generated: test-metrics.xlsx (${excelSize} KB)\n`);
  } catch (error: any) {
    console.error(`   ❌ Excel export failed: ${error.message}\n`);
  }
  
  // Test PNG Export (Network Graph)
  try {
    console.log('🖼️  Testing PNG Export (Network Graph)...');
    const imageExporter = new ImageExporter();
    const networkImg = await imageExporter.exportNetworkGraph(graph);
    
    fs.writeFileSync('test-network.png', networkImg);
    const imgSize = (networkImg.length / 1024).toFixed(2);
    console.log(`   ✅ PNG generated: test-network.png (${imgSize} KB)\n`);
  } catch (error: any) {
    console.error(`   ❌ Network graph export failed: ${error.message}\n`);
  }
  
  // Test PNG Export (Hub Score Chart)
  try {
    console.log('📈 Testing PNG Export (Hub Score Chart)...');
    const imageExporter = new ImageExporter();
    const chartImg = await imageExporter.exportHubScoreChart(metrics);
    
    fs.writeFileSync('test-hubscore.png', chartImg);
    const chartSize = (chartImg.length / 1024).toFixed(2);
    console.log(`   ✅ PNG generated: test-hubscore.png (${chartSize} KB)\n`);
  } catch (error: any) {
    console.error(`   ❌ Hub score chart export failed: ${error.message}\n`);
  }
  
  console.log('🎉 Exporter verification complete!');
  console.log('\nGenerated files:');
  console.log('  - test-report.pdf');
  console.log('  - test-metrics.xlsx');
  console.log('  - test-network.png');
  console.log('  - test-hubscore.png');
}

main().catch(console.error);
