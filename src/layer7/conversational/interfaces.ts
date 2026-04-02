/**
 * Layer 7: Conversational ONA - Interfaces
 * 
 * 各模块的接口定义
 */

import {
  ParsedIntent,
  ConversationalRequest,
  ConversationalResponse,
  PermissionCheckResult,
  UserPermissionContext,
  QueryAuditLog,
  IntentParams
} from './types';

// ============================================================================
// Intent Parser Interface
// ============================================================================

/**
 * 意图解析器接口
 */
export interface IIntentParser {
  /**
   * 解析自然语言查询，识别意图和参数
   */
  parse(query: string): Promise<ParsedIntent>;
  
  /**
   * 加载规则配置
   */
  loadRules(rulesPath: string): Promise<void>;
}

// ============================================================================
// Permission Checker Interface
// ============================================================================

/**
 * 权限检查器接口
 */
export interface IPermissionChecker {
  /**
   * 检查用户是否有权限执行该查询
   */
  check(
    userContext: UserPermissionContext,
    intent: ParsedIntent
  ): Promise<PermissionCheckResult>;
  
  /**
   * 获取用户拥有的 Bot 列表
   */
  getUserOwnedBots(userId: string): Promise<string[]>;
}

// ============================================================================
// Orchestrator Interface
// ============================================================================

/**
 * 对话编排器接口
 */
export interface IConversationalOrchestrator {
  /**
   * 处理对话请求（完整流程）
   */
  handleRequest(request: ConversationalRequest): Promise<ConversationalResponse>;
  
  /**
   * 调用 v2.0 分析 API
   */
  invokeAnalysisAPI(intent: ParsedIntent, params: IntentParams): Promise<any>;
}

// ============================================================================
// Response Generator Interface
// ============================================================================

/**
 * 响应生成器接口
 */
export interface IResponseGenerator {
  /**
   * 生成用户友好的文本回复
   */
  generateTextSummary(intent: ParsedIntent, data: any): Promise<string>;
  
  /**
   * 生成 HTML 报告
   */
  generateHTMLReport(intent: ParsedIntent, data: any): Promise<string>;
}

// ============================================================================
// Audit Logger Interface
// ============================================================================

/**
 * 审计日志接口
 */
export interface IAuditLogger {
  /**
   * 记录查询日志
   */
  log(logEntry: QueryAuditLog): Promise<void>;
  
  /**
   * 查询审计日志
   */
  query(filters: {
    userId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<QueryAuditLog[]>;
}
