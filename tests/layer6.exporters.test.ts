/**
 * Exporters Tests (Interface & Basic Functionality)
 */

import { describe, it, expect } from '@jest/globals';
import { PDFExporter } from '../src/layer6/pdf-exporter';
import { ExcelExporter } from '../src/layer6/excel-exporter';
import { ImageExporter } from '../src/layer6/image-exporter';
import { APIServer } from '../src/layer6/api-server';
import { NetworkGraph } from '../src/layer2/models';
import { StructuredMetricsResult } from '../src/layer4/metrics-calculator';

// Sample test data
const sampleGraph: NetworkGraph = {
  version: "2.0",
  graph_id: 'test-graph',
  description: 'Test Graph',
  created_at: new Date(),
  start_time: new Date('2026-01-01'),
  end_time: new Date('2026-01-10'),
  human_nodes: [
    { id: 'h1', name: 'Alice', type: 'human' },
    { id: 'h2', name: 'Bob', type: 'human' },
  ],
  ai_agent_nodes: [
    { id: 'b1', type: 'ai_agent', bot_name: 'Bot1', capabilities: [], functional_tags: [] },
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
  ],
  messages: [
    {
      id: 'm1',
      from_uid: 'h1',
      to_uids: ['h2'],
      content: 'Hello',
      timestamp: new Date('2026-01-01'),
    },
  ],
  summary: {
    total_nodes: 3,
    total_humans: 2,
    total_bots: 1,
    total_edges: 1,
    total_messages: 1,
  },
};

const sampleMetrics: StructuredMetricsResult = {
  nodeMetrics: [
    {
      id: 'h1',
      name: 'Alice',
      type: 'human',
      hubScore: 2.5,
      connoisseurshipLayer: 3,
      degreeCentrality: 1,
      betweennessCentrality: 0.5,
      eigenvectorCentrality: 0.8,
      clusteringCoefficient: 0.6,
    },
    {
      id: 'h2',
      name: 'Bob',
      type: 'human',
      hubScore: 1.0,
      connoisseurshipLayer: 2,
      degreeCentrality: 1,
      betweennessCentrality: 0.3,
      eigenvectorCentrality: 0.5,
      clusteringCoefficient: 0.4,
    },
  ],
  networkMetrics: {
    density: 0.33,
    avgClusteringCoefficient: 0.5,
    modularity: 0.2,
    communities: [0, 1],
  },
  botMetrics: [
    {
      id: 'b1',
      name: 'Bot1',
      
      functionalTags: ['T1'],
      hubScore: 0.5,
    },
  ],
  timestamp: new Date(),
};

describe('PDFExporter', () => {
  it('should instantiate without errors', () => {
    const exporter = new PDFExporter();
    expect(exporter).toBeDefined();
  });
  
  it('should have generate method', () => {
    const exporter = new PDFExporter();
    expect(typeof exporter.generate).toBe('function');
  });
  
  // Note: Full PDF generation requires puppeteer (heavy dependency)
  // Skipping integration test in unit test suite
  it.skip('should generate PDF buffer', async () => {
    const exporter = new PDFExporter();
    const buffer = await exporter.generate(sampleGraph, sampleMetrics);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe('ExcelExporter', () => {
  it('should instantiate without errors', () => {
    const exporter = new ExcelExporter();
    expect(exporter).toBeDefined();
  });
  
  it('should have export method', () => {
    const exporter = new ExcelExporter();
    expect(typeof exporter.export).toBe('function');
  });
  
  // Note: Full Excel generation requires exceljs
  // Skipping integration test in unit test suite
  it.skip('should generate Excel buffer', async () => {
    const exporter = new ExcelExporter();
    const buffer = await exporter.export(sampleMetrics);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe('ImageExporter', () => {
  it('should instantiate without errors', () => {
    const exporter = new ImageExporter();
    expect(exporter).toBeDefined();
  });
  
  it('should have exportNetworkGraph method', () => {
    const exporter = new ImageExporter();
    expect(typeof exporter.exportNetworkGraph).toBe('function');
  });
  
  it('should have exportHubScoreChart method', () => {
    const exporter = new ImageExporter();
    expect(typeof exporter.exportHubScoreChart).toBe('function');
  });
  
  // Note: Full image generation requires puppeteer
  // Skipping integration test in unit test suite
  it.skip('should generate network graph image', async () => {
    const exporter = new ImageExporter();
    const buffer = await exporter.exportNetworkGraph(sampleGraph);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
  
  it.skip('should generate hub score chart image', async () => {
    const exporter = new ImageExporter();
    const buffer = await exporter.exportHubScoreChart(sampleMetrics);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe('APIServer', () => {
  it('should instantiate without errors', () => {
    const server = new APIServer();
    expect(server).toBeDefined();
  });
  
  it('should have start method', () => {
    const server = new APIServer();
    expect(typeof server.start).toBe('function');
  });
  
  it('should have store method', () => {
    const server = new APIServer();
    expect(typeof server.store).toBe('function');
  });
  
  it('should store graph and metrics', () => {
    const server = new APIServer();
    expect(() => {
      server.store('test-id', sampleGraph, sampleMetrics);
    }).not.toThrow();
  });
  
  // Note: Full API server testing requires supertest
  // Skipping integration test in unit test suite
  it.skip('should start server on specified port', async () => {
    const server = new APIServer();
    await expect(server.start(3001)).resolves.toBeUndefined();
  });
});

/**
 * Integration Tests (Skipped - Heavy dependencies)
 * 
 * These tests require:
 * - Puppeteer (200MB+ Chromium download)
 * - ExcelJS (file system writes)
 * - Supertest (HTTP server)
 * 
 * Manual verification script available:
 * - examples/test-exporters.ts
 * 
 * To run integration tests:
 * 1. Ensure Chromium is downloaded: npx puppeteer browsers install chrome
 * 2. Remove .skip from tests below
 * 3. Run: npm test -- layer6.exporters
 */
