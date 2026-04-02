/**
 * Layer 7: E2E Conversation Flow Tests
 */

import { ConversationalOrchestrator } from '../../../src/layer7/conversational/orchestrator';
import { IntentParser } from '../../../src/layer7/conversational/intent-parser';
import { PermissionChecker } from '../../../src/layer7/conversational/permission-checker';
import { ResponseGenerator } from '../../../src/layer7/conversational/response-generator';
import { AuditLogger } from '../../../src/layer7/conversational/audit-logger';
import { OnboardingHelper } from '../../../src/layer7/conversational/onboarding-helper';
import { ErrorMessages, ErrorType } from '../../../src/layer7/conversational/error-messages';
import { IntentType } from '../../../src/layer7/conversational/types';
import { Pool } from 'mysql2/promise';
import * as path from 'path';

const createMockPool = (): Pool => {
  return {
    query: jest.fn().mockResolvedValue([[{ bot_id: 'Bot1' }]])
  } as any;
};

describe('E2E: Conversation Flow', () => {
  let orchestrator: ConversationalOrchestrator;
  let onboarding: OnboardingHelper;

  beforeEach(async () => {
    const mockPool = createMockPool();
    const intentParser = new IntentParser();
    await intentParser.loadRules(path.join(__dirname, '../../../src/layer7/conversational/rules.yaml'));

    orchestrator = new ConversationalOrchestrator({
      intentParser,
      permissionChecker: new PermissionChecker({ db: mockPool }),
      responseGenerator: new ResponseGenerator(),
      auditLogger: new AuditLogger({ db: mockPool })
    });

    onboarding = new OnboardingHelper();
  });

  describe('E2E: 5 Intent Types', () => {
    test('Scenario 1: METRICS_QUERY', async () => {
      const start = Date.now();
      const response = await orchestrator.handleRequest({
        query: '我的 Hub Score 是多少？',
        userId: 'user123'
      });

      expect(response.success).toBe(true);
      expect(response.intent?.type).toBe(IntentType.METRICS_QUERY);
      expect(response.message).toContain('Hub Score');
      expect(Date.now() - start).toBeLessThan(5000);
    });

    test('Scenario 2: NETWORK_QUERY', async () => {
      const response = await orchestrator.handleRequest({
        query: '我和谁有联系？',
        userId: 'user123'
      });

      expect(response.success).toBe(true);
      expect(response.intent?.type).toBe(IntentType.NETWORK_QUERY);
    });

    test('Scenario 3: RANKING_QUERY', async () => {
      const response = await orchestrator.handleRequest({
        query: 'Top 5 最活跃的人',
        userId: 'user123'
      });

      expect(response.success).toBe(true);
      expect(response.intent?.type).toBe(IntentType.RANKING_QUERY);
    });

    test('Scenario 4: TREND_ANALYSIS', async () => {
      const response = await orchestrator.handleRequest({
        query: '本周的趋势如何？',
        userId: 'user123'
      });

      expect(response.success).toBe(true);
      expect(response.intent?.type).toBe(IntentType.TREND_ANALYSIS);
    });

    test('Scenario 5: REPORT_GENERATION', async () => {
      const response = await orchestrator.handleRequest({
        query: '给我一份本周报告',
        userId: 'user123'
      });

      expect(response.success).toBe(true);
      expect(response.intent?.type).toBe(IntentType.REPORT_GENERATION);
      expect(response.attachments).toBeDefined();
    });
  });

  describe('E2E: Error scenarios', () => {
    test('Scenario 6: Permission denied', async () => {
      const response = await orchestrator.handleRequest({
        query: '小A 的 Hub Score',
        userId: 'user123'
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('PERMISSION_DENIED');
    });

    test('Scenario 7: Friendly error messages', () => {
      const message = ErrorMessages.getMessage(ErrorType.PERMISSION_DENIED, {
        targetUser: 'Alice'
      });

      expect(message).toContain('无权');
      expect(message).toContain('试试这些问题');
    });
  });

  describe('E2E: Onboarding', () => {
    test('Scenario 8: Welcome message', () => {
      const welcome = onboarding.getWelcomeMessage('测试');
      expect(welcome).toContain('欢迎');
    });

    test('Scenario 9: Help command', () => {
      const cmd = onboarding.detectCommand('/help');
      expect(cmd).toBe('help');
    });
  });

  describe('E2E: Performance', () => {
    test('Scenario 10: Response < 5s', async () => {
      const start = Date.now();
      await orchestrator.handleRequest({
        query: '我的活跃度',
        userId: 'user123'
      });
      expect(Date.now() - start).toBeLessThan(5000);
    });
  });
});
