/**
 * OCTO-ONA Layer 1: Data Validator
 * 
 * Validates data completeness and reasonableness.
 * Inspired by lessons learned from 2026-03-19.
 */

import { NetworkGraph } from '../layer2/models';

export enum ValidationLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface ValidationIssue {
  level: ValidationLevel;
  code: string;
  message: string;
  details?: Record<string, any>;
  suggestion?: string;
}

export interface ValidationReport {
  passed: boolean;
  issues: ValidationIssue[];
  summary: {
    total_checks: number;
    critical_count: number;
    error_count: number;
    warning_count: number;
    info_count: number;
  };
}

export class DataValidator {
  private issues: ValidationIssue[] = [];
  
  validate(
    graph: NetworkGraph,
    options: {
      expectedNodes?: number;
      expectedMessages?: number;
      uidWhitelist?: string[];
      minMessagesPerNode?: number;
    } = {}
  ): ValidationReport {
    this.issues = [];
    
    this._checkNodeCount(graph, options.expectedNodes);
    this._checkMessageCount(graph, options.expectedMessages);
    this._checkEdgeCount(graph);
    this._checkCoreMemberPresence(graph, options.uidWhitelist);
    this._checkMessageDistribution(graph, options.minMessagesPerNode);
    this._checkEdgeConsistency(graph);
    this._checkTimeRange(graph);
    
    const summary = {
      total_checks: 7,
      critical_count: this.issues.filter(i => i.level === ValidationLevel.CRITICAL).length,
      error_count: this.issues.filter(i => i.level === ValidationLevel.ERROR).length,
      warning_count: this.issues.filter(i => i.level === ValidationLevel.WARNING).length,
      info_count: this.issues.filter(i => i.level === ValidationLevel.INFO).length,
    };
    
    return {
      passed: summary.critical_count === 0 && summary.error_count === 0,
      issues: this.issues,
      summary,
    };
  }
  
  private _checkNodeCount(graph: NetworkGraph, expected?: number): void {
    const total = graph.human_nodes.length + graph.ai_agent_nodes.length;
    
    if (total === 0) {
      this.issues.push({
        level: ValidationLevel.CRITICAL,
        code: 'NODES_ZERO',
        message: 'Network has 0 nodes',
        suggestion: 'Check fetchUsers() result and database connection.',
      });
      return;
    }
    
    if (expected && total < expected * 0.5) {
      this.issues.push({
        level: ValidationLevel.ERROR,
        code: 'NODES_TOO_FEW',
        message: `Only ${total} nodes, expected ~${expected}`,
        suggestion: 'Check UID mapping or database completeness.',
      });
    }
  }
  
  private _checkMessageCount(graph: NetworkGraph, expected?: number): void {
    const count = graph.messages?.length || 0;
    
    if (count === 0) {
      this.issues.push({
        level: ValidationLevel.CRITICAL,
        code: 'MESSAGES_ZERO',
        message: 'Network has 0 messages',
        suggestion: 'Check fetchMessages() and table sharding (message1-4).',
      });
      return;
    }
    
    if (expected && count < expected * 0.1) {
      this.issues.push({
        level: ValidationLevel.ERROR,
        code: 'MESSAGES_TOO_FEW',
        message: `Only ${count} messages, expected ~${expected}`,
        suggestion: 'YZ: "Shouldn\'t be this few" → Check 5 message tables!',
      });
    }
  }
  
  private _checkEdgeCount(graph: NetworkGraph): void {
    const edges = graph.edges.length;
    const nodes = graph.human_nodes.length + graph.ai_agent_nodes.length;
    
    if (edges === 0 && nodes > 0) {
      this.issues.push({
        level: ValidationLevel.CRITICAL,
        code: 'EDGES_ZERO',
        message: 'Nodes exist but 0 edges',
        suggestion: 'Check to_uids inference logic.',
      });
    }
  }
  
  private _checkCoreMemberPresence(graph: NetworkGraph, whitelist?: string[]): void {
    if (!whitelist || whitelist.length === 0) return;
    
    const nodeIds = new Set([
      ...graph.human_nodes.map(n => n.id),
      ...graph.ai_agent_nodes.map(n => n.id),
    ]);
    
    const missing = whitelist.filter(uid => !nodeIds.has(uid));
    
    if (missing.length > 0) {
      this.issues.push({
        level: ValidationLevel.WARNING,
        code: 'WHITELIST_MISSING',
        message: `${missing.length}/${whitelist.length} UIDs not found`,
        details: { sample: missing.slice(0, 3) },
      });
    }
  }
  
  private _checkMessageDistribution(graph: NetworkGraph, min?: number): void {
    if (!graph.messages) return;
    
    const counts = new Map<string, number>();
    graph.messages.forEach(m => {
      counts.set(m.from_uid, (counts.get(m.from_uid) || 0) + 1);
    });
    
    const nodes = graph.human_nodes.length + graph.ai_agent_nodes.length;
    const silent = nodes - counts.size;
    
    if (silent > 0) {
      this.issues.push({
        level: ValidationLevel.INFO,
        code: 'NODES_NO_MESSAGES',
        message: `${silent} nodes sent 0 messages`,
      });
    }
  }
  
  private _checkEdgeConsistency(graph: NetworkGraph): void {
    const nodeIds = new Set([
      ...graph.human_nodes.map(n => n.id),
      ...graph.ai_agent_nodes.map(n => n.id),
    ]);
    
    const orphans = graph.edges.filter(
      e => !nodeIds.has(e.source) || !nodeIds.has(e.target)
    );
    
    if (orphans.length > 0) {
      this.issues.push({
        level: ValidationLevel.ERROR,
        code: 'ORPHAN_EDGES',
        message: `${orphans.length} edges reference missing nodes`,
      });
    }
  }
  
  private _checkTimeRange(graph: NetworkGraph): void {
    const days = (graph.end_time.getTime() - graph.start_time.getTime()) / 86400000;
    
    if (days < 1) {
      this.issues.push({
        level: ValidationLevel.WARNING,
        code: 'TIME_RANGE_SHORT',
        message: `Time range: ${days.toFixed(1)} days (recommend ≥7)`,
      });
    }
  }
  
  static formatReport(report: ValidationReport): string {
    const lines: string[] = [];
    
    lines.push('=== Data Validation Report ===\n');
    lines.push(`Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}\n`);
    lines.push(`Checks: ${report.summary.total_checks}`);
    lines.push(`Critical: ${report.summary.critical_count}`);
    lines.push(`Errors: ${report.summary.error_count}`);
    lines.push(`Warnings: ${report.summary.warning_count}`);
    lines.push(`Info: ${report.summary.info_count}\n`);
    
    if (report.issues.length > 0) {
      lines.push('Issues:\n');
      
      for (const issue of report.issues) {
        const icon = {
          critical: '🔴',
          error: '❌',
          warning: '⚠️',
          info: 'ℹ️',
        }[issue.level];
        
        lines.push(`${icon} [${issue.code}] ${issue.message}`);
        
        if (issue.suggestion) {
          lines.push(`   💡 ${issue.suggestion}`);
        }
        
        lines.push('');
      }
    } else {
      lines.push('No issues! ✨\n');
    }
    
    return lines.join('\n');
  }
}

export function validateNetworkGraph(
  graph: NetworkGraph,
  options?: Parameters<DataValidator['validate']>[1]
): ValidationReport {
  const validator = new DataValidator();
  return validator.validate(graph, options);
}
