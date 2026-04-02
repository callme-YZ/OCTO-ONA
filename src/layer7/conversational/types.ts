/**
 * Layer 7: Conversational ONA - Type Definitions
 * 
 * 对话式组织网络分析的核心类型定义
 */

// ============================================================================
// Intent Types (意图类型)
// ============================================================================

/**
 * 支持的 5 类意图
 */
export enum IntentType {
  METRICS_QUERY = 'metrics_query',       // 指标查询："我的 Hub Score 是多少？"
  NETWORK_QUERY = 'network_query',       // 网络查询："我和谁有联系？"
  RANKING_QUERY = 'ranking_query',       // 排名查询："谁最活跃？"
  TREND_ANALYSIS = 'trend_analysis',     // 趋势分析："最近一周的消息量？"
  REPORT_GENERATION = 'report_generation' // 报告生成："给我一份本周报告"
}

/**
 * 解析后的意图
 */
export interface ParsedIntent {
  type: IntentType;
  confidence: number;              // 置信度 0-1
  params: IntentParams;            // 提取的参数
  rawQuery: string;                // 原始查询
}

/**
 * 意图参数
 */
export interface IntentParams {
  targetUser?: string;             // 目标用户 ID
  targetBot?: string;              // 目标 Bot ID
  timeRange?: TimeRange;           // 时间范围
  metricType?: string;             // 指标类型 (hub_score, activity_level, etc.)
  limit?: number;                  // Top N
  reportFormat?: 'html' | 'pdf';   // 报告格式
  [key: string]: any;              // 其他参数
}

/**
 * 时间范围
 */
export interface TimeRange {
  start?: Date;
  end?: Date;
  preset?: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month';
}

// ============================================================================
// Permission Types (权限类型)
// ============================================================================

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;                 // 拒绝原因（如果 allowed=false）
  allowedTargets?: string[];       // 允许查询的目标列表
}

/**
 * 用户权限上下文
 */
export interface UserPermissionContext {
  userId: string;
  ownedBots: string[];             // 用户拥有的 Bot 列表
}

// ============================================================================
// Orchestration Types (编排类型)
// ============================================================================

/**
 * 对话请求
 */
export interface ConversationalRequest {
  query: string;                   // 自然语言查询
  userId: string;                  // 请求用户 ID
  conversationId?: string;         // 会话 ID（用于上下文管理）
}

/**
 * 对话响应
 */
export interface ConversationalResponse {
  success: boolean;
  intent?: ParsedIntent;           // 识别的意图
  data?: any;                      // 分析结果数据
  message: string;                 // 用户友好的文本回复
  attachments?: ResponseAttachment[]; // 附件（报告、图表等）
  error?: string;                  // 错误信息
}

/**
 * 响应附件
 */
export interface ResponseAttachment {
  type: 'html' | 'image' | 'pdf';
  url?: string;                    // 文件 URL
  content?: string;                // 内联内容（HTML）
  filename?: string;
}

// ============================================================================
// Audit Types (审计类型)
// ============================================================================

/**
 * 查询审计日志
 */
export interface QueryAuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  query: string;
  intent: IntentType;
  success: boolean;
  executionTimeMs: number;
  error?: string;
}

// ============================================================================
// Rule Types (规则类型)
// ============================================================================

/**
 * 意图识别规则
 */
export interface IntentRule {
  type: IntentType;
  keywords: string[];              // 关键词
  patterns: string[];              // 正则表达式模式
  priority: number;                // 优先级（数字越大优先级越高）
}

/**
 * 参数提取规则
 */
export interface ParamExtractionRule {
  paramName: string;
  pattern: string;                 // 正则表达式
  transformer?: (match: string) => any; // 转换函数
}
