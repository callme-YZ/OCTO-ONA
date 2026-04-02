/**
 * Layer 7: Conversational ONA - Orchestrator Tests
 * 
 * 集成测试：完整流程验证
 */

import { ConversationalOrchestrator } from '../../../src/layer7/conversational/orchestrator';
import { IntentParser } from '../../../src/layer7/conversational/intent-parser';
import { PermissionChecker } from '../../../src/layer7/conversational/permission-checker';
import { ResponseGenerator } from '../../../src/layer7/conversational/response-generator';
import { AuditLogger } from '../../../src/layer7/conversational/audit-logger';
import { ConversationalRequest, IntentType } from '../../../src/layer7/conversational/types';
import { Pool } from 'mysql2/promise';
import * as path from 'path';

// Mock Database
const createMockPool = (): Pool => {
  return {
    query: jest.fn()
      .mockResolvedValueOnce([[ // getUserOwnedBots
        { bot_id: 'Bot1' },
        { bot_id: 'Bot2' }
      ]])
      .mockResolvedValueOnce([]) // log audit
  } as any;
};

describe('ConversationalOrchestrator', () => {
  let orchestrator: ConversationalOrchestrator;
  let mockPool: Pool;

  beforeEach(async () => {
    mockPool = createMockPool();

    const intentParser = new IntentParser();
    await intentParser.loadRules(path.join(__dirname, '../../../src/layer7/conversational/rules.yaml'));

    const permissionChecker = new PermissionChecker({ db: mockPool });
    const responseGenerator = new ResponseGenerator();
    const auditLogger = new AuditLogger({ db: mockPool });

    orchestrator = new ConversationalOrchestrator({
      intentParser,
      permissionChecker,
      responseGenerator,
      auditLogger
    });
  });

  // ============================================================================
  // 测试：完整流程（成功）
  // ============================================================================
  describe('Full flow (success)', () => {
    test('Case 1: Metrics query for self', async () => {
      const request: ConversationalRequest = {
        query: '我的 Hub Score 是多少？',
        userId: 'user123'
      };

      const response = await orchestrator.handleRequest(request);

      expect(response.success).toBe(true);
      expect(response.intent?.type).toBe(IntentType.METRICS_QUERY);
      expect(response.message).toContain('Hub Score');
      expect(response.data).toBeDefined();
    });

    test('Case 2: Network query', async () => {
      const request: ConversationalRequest = {
        query: '我和谁有联系？',
        userId: 'user123'
      };

      const response = await orchestrator.handleRequest(request);

      expect(response.success).toBe(true);
      expect(response.intent?.type).toBe(IntentType.NETWORK_QUERY);
      expect(response.message).toBeTruthy();
    });

    test('Case 3: Ranking query', async () => {
      const request: ConversationalRequest = {
        query: 'Top 5 最活跃的人是谁？',
        userId: 'user123'
      };

      const response = await orchestrator.handleRequest(request);

      expect(response.success).toBe(true);
      expect(response.intent?.type).toBe(IntentType.RANKING_QUERY);
      expect(response.message).toContain('排名');
    });

    test('Case 4: Report generation with HTML attachment', async () => {
      const request: ConversationalRequest = {
        query: '给我一份本周报告',
        userId: 'user123'
      };

      const response = await orchestrator.handleRequest(request);

      expect(response.success).toBe(true);
      expect(response.intent?.type).toBe(IntentType.REPORT_GENERATION);
      expect(response.attachments).toBeDefined();
      expect(response.attachments?.[0].type).toBe('html');
    });
  });

  // ============================================================================
  // 测试：权限拒绝
  // ============================================================================
  describe('Permission denied', () => {
    test('Case 5: Query other user (denied)', async () => {
      const request: ConversationalRequest = {
        query: '小A 的 Hub Score 如何？',
        userId: 'user123'
      };

      const response = await orchestrator.handleRequest(request);

      expect(response.success).toBe(false);
      expect(response.error).toBe('PERMISSION_DENIED');
      expect(response.message).toContain('无权查询用户');
    });

    test('Case 6: Query unowned bot (denied)', async () => {
      // Reset mock to return empty ownedBots
      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce([[]])  // getUserOwnedBots returns empty
        .mockResolvedValueOnce([]);   // log audit

      const request: ConversationalRequest = {
        query: 'Bot999 的活跃度',
        userId: 'user123'
      };

      const response = await orchestrator.handleRequest(request);

      expect(response.success).toBe(false);
      expect(response.error).toBe('PERMISSION_DENIED');
      expect(response.message).toContain('无权查询 Bot');
    });
  });

  // ============================================================================
  // 测试：API 错误降级
  // ============================================================================
  describe('API error handling', () => {
    test('Case 7: API error (graceful degradation)', async () => {
      // 注入一个会抛出错误的 API 函数
      const orchestratorWithFailingAPI = new ConversationalOrchestrator({
        intentParser: orchestrator['intentParser'],
        permissionChecker: orchestrator['permissionChecker'],
        responseGenerator: orchestrator['responseGenerator'],
        auditLogger: orchestrator['auditLogger'],
        invokeV2API: async () => {
          throw new Error('API connection timeout');
        }
      });

      const request: ConversationalRequest = {
        query: '我的 Hub Score 是多少？',
        userId: 'user123'
      };

      const response = await orchestratorWithFailingAPI.handleRequest(request);

      expect(response.success).toBe(false);
      expect(response.error).toBe('API_ERROR');
      expect(response.message).toContain('系统暂时无法处理');
    });
  });

  // ============================================================================
  // 测试：审计日志
  // ============================================================================
  describe('Audit logging', () => {
    test('Case 8: All queries are audited', async () => {
      const request: ConversationalRequest = {
        query: '我的活跃度如何？',
        userId: 'user123'
      };

      await orchestrator.handleRequest(request);

      // 验证 log 方法被调用
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversational_query_logs'),
        expect.any(Array)
      );
    });

    test('Case 9: Failed queries are also audited', async () => {
      const request: ConversationalRequest = {
        query: '小A 的数据',
        userId: 'user123'
      };

      await orchestrator.handleRequest(request);

      // 验证即使权限拒绝，也会记录审计日志
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversational_query_logs'),
        expect.any(Array)
      );
    });
  });

  // ============================================================================
  // 测试：Response Generator
  // ============================================================================
  describe('Response generation', () => {
    test('Case 10: Metrics summary is user-friendly', async () => {
      const request: ConversationalRequest = {
        query: '我的 Hub Score 是多少？',
        userId: 'user123'
      };

      const response = await orchestrator.handleRequest(request);

      expect(response.message).toContain('Hub Score');
      expect(response.message).toMatch(/\d+\.\d+/); // Contains a number
      expect(response.message).toContain('级别');
    });

    test('Case 11: Network summary shows connections', async () => {
      const request: ConversationalRequest = {
        query: '我和谁有联系？',
        userId: 'user123'
      };

      const response = await orchestrator.handleRequest(request);

      expect(response.message).toContain('协作网络');
      expect(response.message).toContain('联系人');
    });
  });
});
