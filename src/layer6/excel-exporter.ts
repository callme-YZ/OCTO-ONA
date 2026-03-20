/**
 * Excel Exporter
 * 
 * Exports metrics to Excel with multiple sheets.
 */

import ExcelJS from 'exceljs';
import { StructuredMetricsResult } from '../layer4/metrics-calculator';

export class ExcelExporter {
  async export(metrics: StructuredMetricsResult): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Node Metrics
    this.buildNodeMetricsSheet(workbook, metrics);
    
    // Sheet 2: Network Metrics
    this.buildNetworkMetricsSheet(workbook, metrics);
    
    // Sheet 3: Bot Metrics
    this.buildBotMetricsSheet(workbook, metrics);
    
    // Write to buffer
    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }
  
  private buildNodeMetricsSheet(workbook: ExcelJS.Workbook, metrics: StructuredMetricsResult): void {
    const sheet = workbook.addWorksheet('Node Metrics');
    
    // Header
    sheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Hub Score', key: 'hubScore', width: 15 },
      { header: 'Layer', key: 'layer', width: 10 },
      { header: 'Degree', key: 'degree', width: 12 },
      { header: 'Betweenness', key: 'betweenness', width: 15 },
      { header: 'Eigenvector', key: 'eigenvector', width: 15 },
      { header: 'Clustering', key: 'clustering', width: 15 },
    ];
    
    // Data
    for (const node of metrics.nodeMetrics) {
      sheet.addRow({
        id: node.id,
        name: node.name,
        type: node.type,
        hubScore: node.hubScore === Infinity ? '∞' : node.hubScore,
        layer: node.connoisseurshipLayer,
        degree: node.degreeCentrality,
        betweenness: node.betweennessCentrality,
        eigenvector: node.eigenvectorCentrality,
        clustering: node.clusteringCoefficient,
      });
    }
    
    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF667EEA' },
    };
  }
  
  private buildNetworkMetricsSheet(workbook: ExcelJS.Workbook, metrics: StructuredMetricsResult): void {
    const sheet = workbook.addWorksheet('Network Metrics');
    
    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];
    
    sheet.addRow({ metric: 'Density', value: metrics.networkMetrics.density });
    sheet.addRow({ metric: 'Avg Clustering Coefficient', value: metrics.networkMetrics.avgClusteringCoefficient });
    sheet.addRow({ metric: 'Modularity', value: metrics.networkMetrics.modularity });
    
    sheet.getRow(1).font = { bold: true };
  }
  
  private buildBotMetricsSheet(workbook: ExcelJS.Workbook, metrics: StructuredMetricsResult): void {
    const sheet = workbook.addWorksheet('Bot Metrics');
    
    sheet.columns = [
      { header: 'Bot ID', key: 'id', width: 30 },
      { header: 'Bot Name', key: 'name', width: 20 },
      { header: 'Functional Tags', key: 'tags', width: 40 },
      { header: 'Hub Score', key: 'hubScore', width: 15 },
    ];
    
    for (const bot of metrics.botMetrics) {
      sheet.addRow({
        id: bot.id,
        name: bot.name,
        tags: bot.functionalTags.join(', '),
        hubScore: bot.hubScore === Infinity ? '∞' : bot.hubScore,
      });
    }
    
    sheet.getRow(1).font = { bold: true };
  }
}
