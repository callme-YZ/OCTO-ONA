/**
 * Image Exporter
 * 
 * Exports network graphs and charts as PNG images.
 * Uses puppeteer + ECharts for server-side rendering.
 */

import puppeteer from 'puppeteer';
import { NetworkGraph } from '../layer2/models';
import { StructuredMetricsResult } from '../layer4/metrics-calculator';

export interface ImageExportOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
}

export class ImageExporter {
  /**
   * Export network graph as PNG
   */
  async exportNetworkGraph(
    graph: NetworkGraph,
    options: ImageExportOptions = {}
  ): Promise<Buffer> {
    const { width = 1920, height = 1080, backgroundColor = '#ffffff' } = options;
    
    const html = this.buildNetworkGraphHTML(graph, width, height, backgroundColor);
    
    return await this.renderHTML(html, width, height);
  }
  
  /**
   * Export hub score rankings as PNG
   */
  async exportHubScoreChart(
    metrics: StructuredMetricsResult,
    options: ImageExportOptions = {}
  ): Promise<Buffer> {
    const { width = 1200, height = 800, backgroundColor = '#ffffff' } = options;
    
    const html = this.buildHubScoreChartHTML(metrics, width, height, backgroundColor);
    
    return await this.renderHTML(html, width, height);
  }
  
  private async renderHTML(html: string, width: number, height: number): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport({ width, height });
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Wait for ECharts to render
      await new Promise(r => setTimeout(r, 1000));
      
      const screenshot = await page.screenshot({ type: 'png', fullPage: false });
      return Buffer.from(screenshot);
    } finally {
      await browser.close();
    }
  }
  
  private buildNetworkGraphHTML(
    graph: NetworkGraph,
    width: number,
    height: number,
    backgroundColor: string
  ): string {
    const nodes = [
      ...graph.human_nodes.map(h => ({ id: h.id, name: h.name, category: 0 })),
      ...graph.ai_agent_nodes.map(b => ({ id: b.id, name: b.bot_name, category: 1 })),
    ];
    
    const links = graph.edges.map(e => ({
      source: e.source,
      target: e.target,
      value: e.weight,
    }));
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
  <style>
    body { margin: 0; padding: 0; background: ${backgroundColor}; }
    #chart { width: ${width}px; height: ${height}px; }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script>
    const chart = echarts.init(document.getElementById('chart'));
    
    const option = {
      title: {
        text: 'Network Graph',
        left: 'center',
        top: 20,
        textStyle: { fontSize: 28, fontWeight: 'bold' }
      },
      legend: {
        data: ['Human', 'Bot'],
        top: 70,
        left: 'center',
      },
      series: [{
        type: 'graph',
        layout: 'force',
        data: ${JSON.stringify(nodes)},
        links: ${JSON.stringify(links)},
        categories: [
          { name: 'Human' },
          { name: 'Bot' }
        ],
        roam: true,
        label: {
          show: true,
          position: 'right',
          formatter: '{b}'
        },
        labelLayout: {
          hideOverlap: true
        },
        lineStyle: {
          color: 'source',
          curveness: 0.3
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 10 }
        },
        force: {
          repulsion: 100,
          edgeLength: [50, 100]
        }
      }]
    };
    
    chart.setOption(option);
  </script>
</body>
</html>
    `;
  }
  
  private buildHubScoreChartHTML(
    metrics: StructuredMetricsResult,
    width: number,
    height: number,
    backgroundColor: string
  ): string {
    const topNodes = metrics.nodeMetrics
      .sort((a, b) => b.hubScore - a.hubScore)
      .slice(0, 10);
    
    const names = topNodes.map(n => n.name);
    const scores = topNodes.map(n => n.hubScore === Infinity ? 100 : n.hubScore);
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
  <style>
    body { margin: 0; padding: 0; background: ${backgroundColor}; }
    #chart { width: ${width}px; height: ${height}px; }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script>
    const chart = echarts.init(document.getElementById('chart'));
    
    const option = {
      title: {
        text: 'Top 10 Hub Scores',
        left: 'center',
        top: 20,
        textStyle: { fontSize: 28, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '15%',
        right: '10%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: 'Hub Score'
      },
      yAxis: {
        type: 'category',
        data: ${JSON.stringify(names.reverse())},
        axisLabel: { fontSize: 14 }
      },
      series: [{
        name: 'Hub Score',
        type: 'bar',
        data: ${JSON.stringify(scores.reverse())},
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' }
          ])
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}'
        }
      }]
    };
    
    chart.setOption(option);
  </script>
</body>
</html>
    `;
  }
}
