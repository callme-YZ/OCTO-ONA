/**
 * Layer 7: Conversational ONA - Onboarding Helper
 * 
 * 引导式对话和用户入门
 */

/**
 * 示例问题
 */
export interface ExampleQuery {
  category: string;
  query: string;
  description: string;
}

/**
 * 场景化入口
 */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  exampleQueries: string[];
}

/**
 * Onboarding Helper
 */
export class OnboardingHelper {
  /**
   * 生成欢迎消息
   */
  getWelcomeMessage(userName?: string): string {
    const greeting = userName ? `你好，${userName}！` : '你好！';
    
    return `
${greeting} 👋

欢迎使用 OCTO-ONA 对话式组织网络分析系统。

我可以帮你：
📊 查询个人或团队的 Hub Score、活跃度等指标
🌐 分析协作网络和关系
🏆 查看团队排名
📈 追踪趋势变化
📝 生成分析报告

**试试这些问题：**
• "我的 Hub Score 是多少？"
• "本周的活跃度如何？"
• "Top 5 最活跃的人是谁？"
• "给我一份本月报告"

输入 **/help** 查看更多示例和功能说明。
    `.trim();
  }

  /**
   * 获取帮助消息
   */
  getHelpMessage(): string {
    return `
📖 **OCTO-ONA 使用指南**

## 📊 指标查询
• "我的 Hub Score 是多少？"
• "小A 的活跃度如何？"
• "Bot1 的消息数"

## 🌐 网络分析
• "我和谁有联系？"
• "小A 的协作网络"
• "显示我的网络图"

## 🏆 排名查询
• "Top 5 最活跃的人"
• "Hub Score 排名前十"
• "本周谁最活跃？"

## 📈 趋势分析
• "我的活跃度趋势如何？"
• "本周的趋势"
• "最近一个月的变化"

## 📝 报告生成
• "给我一份本周报告"
• "生成个人分析报告"
• "导出 HTML 报告"

## 💡 提示
• 使用"他/她"指代之前提到的人
• 时间范围会自动继承上一次查询
• 输入 **/scenarios** 查看场景化示例

**需要更多帮助？** 直接问我任何问题！
    `.trim();
  }

  /**
   * 获取场景列表
   */
  getScenarios(): Scenario[] {
    return [
      {
        id: 'personal-insight',
        name: '📊 个人洞察',
        description: '了解自己在团队中的角色和影响力',
        exampleQueries: [
          '我的 Hub Score 是多少？',
          '我的活跃度如何？',
          '我和谁有协作？',
          '我的影响力趋势如何？'
        ]
      },
      {
        id: 'team-overview',
        name: '👥 团队概览',
        description: '查看团队整体状态和关键人物',
        exampleQueries: [
          'Top 5 最活跃的人是谁？',
          '谁是团队的核心节点？',
          '团队的协作网络如何？',
          '本周团队活跃度如何？'
        ]
      },
      {
        id: 'bot-monitoring',
        name: '🤖 Bot 监控',
        description: '监控 Bot 的运行状态和影响',
        exampleQueries: [
          'Bot1 的活跃度',
          'Bot2 和谁有互动？',
          '哪个 Bot 最活跃？',
          'Bot 使用趋势'
        ]
      },
      {
        id: 'trend-tracking',
        name: '📈 趋势追踪',
        description: '追踪时间序列变化和发展趋势',
        exampleQueries: [
          '本周的活跃度趋势',
          '我的 Hub Score 变化',
          '团队协作趋势如何？',
          '最近一个月的变化'
        ]
      },
      {
        id: 'reporting',
        name: '📝 定期报告',
        description: '生成周报、月报等分析报告',
        exampleQueries: [
          '给我一份本周报告',
          '生成个人月报',
          '导出团队分析报告',
          '生成 HTML 报告'
        ]
      }
    ];
  }

  /**
   * 获取场景化消息
   */
  getScenariosMessage(): string {
    const scenarios = this.getScenarios();
    
    let message = '🎯 **场景化示例**\n\n';
    message += '选择你的场景，快速开始：\n\n';

    for (const scenario of scenarios) {
      message += `**${scenario.name}**\n`;
      message += `${scenario.description}\n\n`;
      message += '试试这些：\n';
      for (const query of scenario.exampleQueries) {
        message += `• "${query}"\n`;
      }
      message += '\n';
    }

    return message.trim();
  }

  /**
   * 获取示例问题列表
   */
  getExampleQueries(): ExampleQuery[] {
    return [
      // 指标查询
      {
        category: '📊 指标查询',
        query: '我的 Hub Score 是多少？',
        description: '查询个人的 Hub Score'
      },
      {
        category: '📊 指标查询',
        query: '小A 的活跃度如何？',
        description: '查询团队成员的活跃度'
      },
      {
        category: '📊 指标查询',
        query: 'Bot1 本周的消息数',
        description: '查询 Bot 的消息统计'
      },

      // 网络分析
      {
        category: '🌐 网络分析',
        query: '我和谁有联系？',
        description: '查看协作网络'
      },
      {
        category: '🌐 网络分析',
        query: '小A 的协作关系',
        description: '查看成员的协作关系'
      },

      // 排名查询
      {
        category: '🏆 排名查询',
        query: 'Top 5 最活跃的人',
        description: '查看活跃度排名'
      },
      {
        category: '🏆 排名查询',
        query: 'Hub Score 前十名',
        description: '查看 Hub Score 排名'
      },

      // 趋势分析
      {
        category: '📈 趋势分析',
        query: '我的活跃度趋势如何？',
        description: '查看个人趋势'
      },
      {
        category: '📈 趋势分析',
        query: '本周的团队活跃度',
        description: '查看团队趋势'
      },

      // 报告生成
      {
        category: '📝 报告生成',
        query: '给我一份本周报告',
        description: '生成周报'
      },
      {
        category: '📝 报告生成',
        query: '生成个人分析报告',
        description: '生成详细报告'
      }
    ];
  }

  /**
   * 检测命令（如 /help, /scenarios）
   */
  detectCommand(query: string): 'help' | 'scenarios' | 'welcome' | null {
    const trimmed = query.trim().toLowerCase();
    
    if (trimmed === '/help' || trimmed === '帮助' || trimmed === 'help') {
      return 'help';
    }
    
    if (trimmed === '/scenarios' || trimmed === '场景' || trimmed === 'scenarios') {
      return 'scenarios';
    }
    
    if (trimmed === '/welcome' || trimmed === '欢迎' || trimmed === 'welcome') {
      return 'welcome';
    }
    
    return null;
  }

  /**
   * 处理命令（返回相应消息）
   */
  handleCommand(command: 'help' | 'scenarios' | 'welcome', userName?: string): string {
    switch (command) {
      case 'help':
        return this.getHelpMessage();
      case 'scenarios':
        return this.getScenariosMessage();
      case 'welcome':
        return this.getWelcomeMessage(userName);
      default:
        return '';
    }
  }

  /**
   * 判断是否是首次用户（基于历史长度）
   */
  isFirstTimeUser(historyLength: number): boolean {
    return historyLength === 0;
  }
}
