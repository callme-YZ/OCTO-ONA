/**
 * Layer 7: Conversational ONA - Orchestrator
 * 
 * 对话编排器：整合意图解析、权限检查、API 调用、响应生成
 */

import { IConversationalOrchestrator } from './interfaces';
import { IntentParser } from './intent-parser';
import { PermissionChecker } from './permission-checker';
import { ResponseGenerator } from './response-generator';
import { AuditLogger } from './audit-logger';
import {
  ConversationalRequest,
  ConversationalResponse,
  ParsedIntent,
  IntentParams,
  IntentType,
  ResponseAttachment
} from './types';

/**
 * 编排器配置
 */
export interface OrchestratorConfig {
  intentParser: IntentParser;
  permissionChecker: PermissionChecker;
  responseGenerator: ResponseGenerator;
  auditLogger: AuditLogger;
  // v2.0 API 调用函数（由外部注入）
  invokeV2API?: (intent: ParsedIntent, params: IntentParams) => Promise<any>;
}

/**
 * 对话编排器实现
 */
export class ConversationalOrchestrator implements IConversationalOrchestrator {
  private intentParser: IntentParser;
  private permissionChecker: PermissionChecker;
  private responseGenerator: ResponseGenerator;
  private auditLogger: AuditLogger;
  private invokeV2API?: (intent: ParsedIntent, params: IntentParams) => Promise<any>;

  constructor(config: OrchestratorConfig) {
    this.intentParser = config.intentParser;
    this.permissionChecker = config.permissionChecker;
    this.responseGenerator = config.responseGenerator;
    this.auditLogger = config.auditLogger;
    this.invokeV2API = config.invokeV2API;
  }

  /**
   * 处理对话请求（完整流程）
   */
  async handleRequest(request: ConversationalRequest): Promise<ConversationalResponse> {
    const startTime = Date.now();
    let intent: ParsedIntent | undefined;

    try {
      // Step 1: 意图解析
      console.log(`[Orchestrator] Parsing query: "${request.query}"`);
      intent = await this.intentParser.parse(request.query);
      console.log(`[Orchestrator] Detected intent: ${intent.type} (confidence=${intent.confidence.toFixed(2)})`);

      // Step 2: 权限检查
      console.log(`[Orchestrator] Checking permissions for user: ${request.userId}`);
      const userContext = await this.permissionChecker.buildContext(request.userId);
      const permissionResult = await this.permissionChecker.check(userContext, intent);

      if (!permissionResult.allowed) {
        // 权限拒绝
        const executionTime = Date.now() - startTime;
        await this.auditLogger.log(
          this.auditLogger.createLogEntry(
            request.userId,
            request.query,
            intent.type,
            false,
            executionTime,
            `Permission denied: ${permissionResult.reason}`
          )
        );

        return {
          success: false,
          intent,
          message: permissionResult.reason || '您无权执行此查询。',
          error: 'PERMISSION_DENIED'
        };
      }

      console.log(`[Orchestrator] Permission granted. Allowed targets: ${permissionResult.allowedTargets?.join(', ')}`);

      // Step 3: 调用 v2.0 API
      let data: any;
      try {
        console.log(`[Orchestrator] Invoking v2.0 API...`);
        data = await this.invokeAnalysisAPI(intent, intent.params);
        console.log(`[Orchestrator] API call successful`);
      } catch (apiError: any) {
        // API 调用失败，降级处理
        console.error(`[Orchestrator] API call failed:`, apiError);
        const executionTime = Date.now() - startTime;
        await this.auditLogger.log(
          this.auditLogger.createLogEntry(
            request.userId,
            request.query,
            intent.type,
            false,
            executionTime,
            `API error: ${apiError.message}`
          )
        );

        return {
          success: false,
          intent,
          message: '抱歉，系统暂时无法处理您的请求。请稍后再试。',
          error: 'API_ERROR'
        };
      }

      // Step 4: 生成响应
      console.log(`[Orchestrator] Generating response...`);
      const message = await this.responseGenerator.generateTextSummary(intent, data);

      // Step 5: 生成附件（如果需要 HTML 报告）
      const attachments: ResponseAttachment[] = [];
      if (intent.type === IntentType.REPORT_GENERATION || intent.params.reportFormat === 'html') {
        const htmlReport = await this.responseGenerator.generateHTMLReport(intent, data);
        attachments.push({
          type: 'html',
          content: htmlReport,
          filename: 'report.html'
        });
      }

      // Step 6: 审计日志
      const executionTime = Date.now() - startTime;
      await this.auditLogger.log(
        this.auditLogger.createLogEntry(
          request.userId,
          request.query,
          intent.type,
          true,
          executionTime
        )
      );

      console.log(`[Orchestrator] Request completed in ${executionTime}ms`);

      return {
        success: true,
        intent,
        data,
        message,
        attachments: attachments.length > 0 ? attachments : undefined
      };

    } catch (error: any) {
      // 未预期的错误
      console.error(`[Orchestrator] Unexpected error:`, error);
      const executionTime = Date.now() - startTime;

      if (intent) {
        await this.auditLogger.log(
          this.auditLogger.createLogEntry(
            request.userId,
            request.query,
            intent.type,
            false,
            executionTime,
            `Unexpected error: ${error.message}`
          )
        );
      }

      return {
        success: false,
        intent,
        message: '抱歉，处理您的请求时发生错误。',
        error: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * 调用 v2.0 分析 API
   */
  async invokeAnalysisAPI(intent: ParsedIntent, params: IntentParams): Promise<any> {
    // 如果外部注入了 API 调用函数，使用它
    if (this.invokeV2API) {
      return await this.invokeV2API(intent, params);
    }

    // 否则返回 Mock 数据（用于测试）
    console.warn(`[Orchestrator] No v2.0 API configured, returning mock data`);
    return this.getMockData(intent.type);
  }

  /**
   * Mock 数据（用于测试）
   */
  private getMockData(intentType: IntentType): any {
    switch (intentType) {
      case IntentType.METRICS_QUERY:
        return {
          hub_score: 2.5,
          activity_level: 'High',
          message_count: 1234
        };

      case IntentType.NETWORK_QUERY:
        return {
          connections: [
            { id: 'user1', name: 'Alice' },
            { id: 'user2', name: 'Bob' },
            { id: 'bot1', name: 'Bot1' }
          ]
        };

      case IntentType.RANKING_QUERY:
        return {
          ranking: [
            { id: 'user1', name: 'Alice', score: 3.5 },
            { id: 'user2', name: 'Bob', score: 2.8 },
            { id: 'user3', name: 'Charlie', score: 2.1 }
          ]
        };

      case IntentType.TREND_ANALYSIS:
        return {
          trend: [
            { date: '2026-03-01', value: 100 },
            { date: '2026-03-08', value: 120 },
            { date: '2026-03-15', value: 150 }
          ]
        };

      case IntentType.REPORT_GENERATION:
        return {
          summary: 'Weekly report',
          metrics: { hub_score: 2.5, activity: 'High' }
        };

      default:
        return {};
    }
  }
}
