/**
 * Layer 7: Conversational ONA - Onboarding Helper Tests
 */

import { OnboardingHelper } from '../../../src/layer7/conversational/onboarding-helper';

describe('OnboardingHelper', () => {
  let helper: OnboardingHelper;

  beforeEach(() => {
    helper = new OnboardingHelper();
  });

  // ============================================================================
  // 测试：欢迎消息
  // ============================================================================
  describe('Welcome message', () => {
    test('Case 1: Generate welcome message without name', () => {
      const message = helper.getWelcomeMessage();

      expect(message).toContain('你好！');
      expect(message).toContain('OCTO-ONA');
      expect(message).toContain('Hub Score');
      expect(message).toContain('/help');
    });

    test('Case 2: Generate welcome message with name', () => {
      const message = helper.getWelcomeMessage('张三');

      expect(message).toContain('你好，张三！');
      expect(message).toContain('欢迎');
    });

    test('Case 3: Welcome includes example queries', () => {
      const message = helper.getWelcomeMessage();

      expect(message).toContain('我的 Hub Score');
      expect(message).toContain('本周的活跃度');
      expect(message).toContain('Top 5');
    });
  });

  // ============================================================================
  // 测试：帮助消息
  // ============================================================================
  describe('Help message', () => {
    test('Case 4: Generate help message', () => {
      const message = helper.getHelpMessage();

      expect(message).toContain('使用指南');
      expect(message).toContain('📊 指标查询');
      expect(message).toContain('🌐 网络分析');
      expect(message).toContain('🏆 排名查询');
      expect(message).toContain('📈 趋势分析');
      expect(message).toContain('📝 报告生成');
    });

    test('Case 5: Help includes categories', () => {
      const message = helper.getHelpMessage();

      expect(message).toContain('指标查询');
      expect(message).toContain('网络分析');
      expect(message).toContain('排名查询');
      expect(message).toContain('趋势分析');
      expect(message).toContain('报告生成');
    });
  });

  // ============================================================================
  // 测试：场景化入口
  // ============================================================================
  describe('Scenarios', () => {
    test('Case 6: Get scenarios list', () => {
      const scenarios = helper.getScenarios();

      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios[0]).toHaveProperty('id');
      expect(scenarios[0]).toHaveProperty('name');
      expect(scenarios[0]).toHaveProperty('description');
      expect(scenarios[0]).toHaveProperty('exampleQueries');
    });

    test('Case 7: Scenarios include common use cases', () => {
      const scenarios = helper.getScenarios();
      const ids = scenarios.map(s => s.id);

      expect(ids).toContain('personal-insight');
      expect(ids).toContain('team-overview');
      expect(ids).toContain('bot-monitoring');
      expect(ids).toContain('trend-tracking');
      expect(ids).toContain('reporting');
    });

    test('Case 8: Generate scenarios message', () => {
      const message = helper.getScenariosMessage();

      expect(message).toContain('场景化示例');
      expect(message).toContain('📊 个人洞察');
      expect(message).toContain('👥 团队概览');
      expect(message).toContain('🤖 Bot 监控');
    });
  });

  // ============================================================================
  // 测试：示例问题
  // ============================================================================
  describe('Example queries', () => {
    test('Case 9: Get example queries', () => {
      const examples = helper.getExampleQueries();

      expect(examples.length).toBeGreaterThan(0);
      expect(examples[0]).toHaveProperty('category');
      expect(examples[0]).toHaveProperty('query');
      expect(examples[0]).toHaveProperty('description');
    });

    test('Case 10: Examples cover all categories', () => {
      const examples = helper.getExampleQueries();
      const categories = [...new Set(examples.map(e => e.category))];

      expect(categories.length).toBeGreaterThanOrEqual(5);
      expect(categories.some(c => c.includes('指标'))).toBe(true);
      expect(categories.some(c => c.includes('网络'))).toBe(true);
      expect(categories.some(c => c.includes('排名'))).toBe(true);
    });
  });

  // ============================================================================
  // 测试：命令检测
  // ============================================================================
  describe('Command detection', () => {
    test('Case 11: Detect /help command', () => {
      expect(helper.detectCommand('/help')).toBe('help');
      expect(helper.detectCommand('help')).toBe('help');
      expect(helper.detectCommand('帮助')).toBe('help');
      expect(helper.detectCommand('  /help  ')).toBe('help');
    });

    test('Case 12: Detect /scenarios command', () => {
      expect(helper.detectCommand('/scenarios')).toBe('scenarios');
      expect(helper.detectCommand('scenarios')).toBe('scenarios');
      expect(helper.detectCommand('场景')).toBe('scenarios');
    });

    test('Case 13: Detect /welcome command', () => {
      expect(helper.detectCommand('/welcome')).toBe('welcome');
      expect(helper.detectCommand('welcome')).toBe('welcome');
      expect(helper.detectCommand('欢迎')).toBe('welcome');
    });

    test('Case 14: Non-command returns null', () => {
      expect(helper.detectCommand('我的 Hub Score')).toBe(null);
      expect(helper.detectCommand('random text')).toBe(null);
    });
  });

  // ============================================================================
  // 测试：命令处理
  // ============================================================================
  describe('Command handling', () => {
    test('Case 15: Handle help command', () => {
      const message = helper.handleCommand('help');
      expect(message).toContain('使用指南');
    });

    test('Case 16: Handle scenarios command', () => {
      const message = helper.handleCommand('scenarios');
      expect(message).toContain('场景化示例');
    });

    test('Case 17: Handle welcome command', () => {
      const message = helper.handleCommand('welcome', '测试');
      expect(message).toContain('你好，测试！');
    });
  });

  // ============================================================================
  // 测试：首次用户检测
  // ============================================================================
  describe('First time user detection', () => {
    test('Case 18: Empty history = first time user', () => {
      expect(helper.isFirstTimeUser(0)).toBe(true);
    });

    test('Case 19: Non-empty history = returning user', () => {
      expect(helper.isFirstTimeUser(1)).toBe(false);
      expect(helper.isFirstTimeUser(5)).toBe(false);
    });
  });
});
