/**
 * OCTO-ONA Layer 3: Connoisseur Detector
 * 
 * Rule-based connoisseurship detection using keyword matching.
 */

// ============================================
// Keyword Definitions (4 Categories)
// ============================================

/**
 * Evaluation keywords - 评价性语言
 * Pattern: "感觉不对"、"很好"、"应该"
 */
const EVALUATION_KEYWORDS = [
  '感觉', '觉得', '不对', '有问题',
  '不错', '很好', '太', '应该', '不应该',
  '挺好', '还行', '一般', '不行', '可以',
];

/**
 * Critical keywords - 批判性语言
 * Pattern: "为什么"、"质疑"、"不理解"
 */
const CRITICAL_KEYWORDS = [
  '为什么', '怎么', '质疑', '不理解',
  '有疑问', '不合理', '说不通', '不明白',
  '不清楚', '搞不懂', '不知道为啥',
];

/**
 * Comparative keywords - 对比性语言
 * Pattern: "比X好"、"没有Y好用"、"参考"
 */
const COMPARATIVE_KEYWORDS = [
  '比', '相比', '对比', '没有', '好',
  '不如', '优于', '逊于', '参考', '借鉴',
  '类似', '像', '差不多', '更好', '更差',
];

/**
 * Taste keywords - 品味性语言（权重×2）
 * Pattern: "优雅"、"简洁"、"别扭"
 */
const TASTE_KEYWORDS = [
  '美感', '优雅', '简洁', '复杂', '直观',
  '自然', '别扭', '顺畅', '流畅', '生硬',
  '舒服', '难受', '好看', '难看', '美观',
];

// ============================================
// Connoisseur Detector Class
// ============================================

export class ConnoisseurDetector {
  /**
   * Rule-based connoisseurship detector
   * 
   * Detection strategy:
   * - Evaluation keywords: +1 point
   * - Critical keywords: +1 point
   * - Comparative keywords: +1 point
   * - Taste keywords: +2 points (higher weight)
   * - Threshold: score >= 2 → connoisseurship
   */
  
  /**
   * Check if message is connoisseurship
   * 
   * @param content - Message text content
   * @returns true if connoisseurship detected
   */
  static isConnoisseurship(content: string): boolean {
    let score = 0;
    
    // Evaluation keywords: +1
    if (this.containsAny(content, EVALUATION_KEYWORDS)) {
      score += 1;
    }
    
    // Critical keywords: +1
    if (this.containsAny(content, CRITICAL_KEYWORDS)) {
      score += 1;
    }
    
    // Comparative keywords: +1
    if (this.containsAny(content, COMPARATIVE_KEYWORDS)) {
      score += 1;
    }
    
    // Taste keywords: +2 (higher weight)
    if (this.containsAny(content, TASTE_KEYWORDS)) {
      score += 2;
    }
    
    // Threshold: >= 2
    return score >= 2;
  }
  
  /**
   * Get connoisseurship score breakdown
   * 
   * Useful for debugging and verification.
   * 
   * @param content - Message text content
   * @returns { total, evaluation, critical, comparative, taste, isConnoisseurship }
   */
  static getScoreBreakdown(content: string): {
    total: number;
    evaluation: number;
    critical: number;
    comparative: number;
    taste: number;
    isConnoisseurship: boolean;
  } {
    const evaluation = this.containsAny(content, EVALUATION_KEYWORDS) ? 1 : 0;
    const critical = this.containsAny(content, CRITICAL_KEYWORDS) ? 1 : 0;
    const comparative = this.containsAny(content, COMPARATIVE_KEYWORDS) ? 1 : 0;
    const taste = this.containsAny(content, TASTE_KEYWORDS) ? 2 : 0;
    
    const total = evaluation + critical + comparative + taste;
    
    return {
      total,
      evaluation,
      critical,
      comparative,
      taste,
      isConnoisseurship: total >= 2,
    };
  }
  
  /**
   * Check if text contains any keyword from list
   * 
   * @param text - Text to search
   * @param keywords - Keyword list
   * @returns true if any keyword found
   */
  private static containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }
  
  /**
   * Filter connoisseurship messages from list
   * 
   * @param messages - Message objects with content field
   * @returns Array of connoisseurship messages
   */
  static filterConnoisseurshipMessages<T extends { content: string }>(
    messages: T[]
  ): T[] {
    return messages.filter(msg => this.isConnoisseurship(msg.content));
  }
  
  /**
   * Calculate connoisseurship frequency for a user
   * 
   * Frequency = Connoisseurship Messages / Total Messages
   * 
   * @param messages - All messages from the user
   * @returns Frequency ratio [0, 1]
   */
  static calculateFrequency<T extends { content: string }>(
    messages: T[]
  ): number {
    if (messages.length === 0) {
      return 0.0;
    }
    
    const connoisseurshipCount = messages.filter(msg =>
      this.isConnoisseurship(msg.content)
    ).length;
    
    return connoisseurshipCount / messages.length;
  }
  
  /**
   * Get matched keywords from text
   * 
   * Useful for understanding what triggered detection.
   * 
   * @param content - Message text
   * @returns Object with matched keywords by category
   */
  static getMatchedKeywords(content: string): {
    evaluation: string[];
    critical: string[];
    comparative: string[];
    taste: string[];
  } {
    return {
      evaluation: EVALUATION_KEYWORDS.filter(kw => content.includes(kw)),
      critical: CRITICAL_KEYWORDS.filter(kw => content.includes(kw)),
      comparative: COMPARATIVE_KEYWORDS.filter(kw => content.includes(kw)),
      taste: TASTE_KEYWORDS.filter(kw => content.includes(kw)),
    };
  }
}
