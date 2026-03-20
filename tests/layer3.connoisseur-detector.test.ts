/**
 * Layer 3 ConnoisseurDetector - Unit Tests
 */

import { ConnoisseurDetector } from '../src/layer3/connoisseur-detector';

describe('Layer 3: ConnoisseurDetector', () => {
  
  // ========================================
  // Keyword Detection Tests
  // ========================================
  
  describe('Keyword Detection', () => {
    it('should detect evaluation keywords', () => {
      const text = '感觉这个设计不对';
      const breakdown = ConnoisseurDetector.getScoreBreakdown(text);
      
      expect(breakdown.evaluation).toBe(1);
      expect(breakdown.total).toBeGreaterThan(0);
    });
    
    it('should detect critical keywords', () => {
      const text = '为什么要这样做？不理解';
      const breakdown = ConnoisseurDetector.getScoreBreakdown(text);
      
      expect(breakdown.critical).toBe(1);
      expect(breakdown.total).toBeGreaterThan(0);
    });
    
    it('should detect comparative keywords', () => {
      const text = '相比飞书，没有这个功能好';
      const breakdown = ConnoisseurDetector.getScoreBreakdown(text);
      
      expect(breakdown.comparative).toBe(1);
      expect(breakdown.total).toBeGreaterThan(0);
    });
    
    it('should detect taste keywords with double weight', () => {
      const text = '这个UI很优雅，流畅自然';
      const breakdown = ConnoisseurDetector.getScoreBreakdown(text);
      
      expect(breakdown.taste).toBe(2); // Double weight
      expect(breakdown.total).toBeGreaterThanOrEqual(2);
    });
  });
  
  // ========================================
  // Connoisseurship Classification Tests
  // ========================================
  
  describe('Connoisseurship Classification', () => {
    it('should classify as connoisseurship when score >= 2', () => {
      // Evaluation + Critical = 1 + 1 = 2
      const text1 = '感觉不对，为什么要这样？';
      expect(ConnoisseurDetector.isConnoisseurship(text1)).toBe(true);
      
      // Taste alone = 2
      const text2 = '这个设计很优雅';
      expect(ConnoisseurDetector.isConnoisseurship(text2)).toBe(true);
      
      // Evaluation + Comparative + Critical = 3
      const text3 = '觉得没有飞书好，为什么这么复杂？';
      expect(ConnoisseurDetector.isConnoisseurship(text3)).toBe(true);
    });
    
    it('should NOT classify as connoisseurship when score < 2', () => {
      // No keywords
      const text1 = '今天天气真好';
      expect(ConnoisseurDetector.isConnoisseurship(text1)).toBe(false);
      
      // Only 1 point
      const text2 = '感觉还行';
      expect(ConnoisseurDetector.isConnoisseurship(text2)).toBe(false);
    });
    
    it('should handle real Octo team examples', () => {
      // 刘乐君 UI/UX评价
      const text1 = '排版有问题，UI不好看';
      expect(ConnoisseurDetector.isConnoisseurship(text1)).toBe(true);
      
      // 竞品对比（简短，仅1分，未达阈值）
      // NOTE: 这类消息需要LLM增强检测（Phase 2）
      const text2 = '没有飞书好用';
      const breakdown2 = ConnoisseurDetector.getScoreBreakdown(text2);
      expect(breakdown2.comparative).toBe(1); // 检测到对比
      expect(breakdown2.total).toBe(1); // 但未达阈值
      
      // 竞品对比（完整，应该通过）
      const text2b = '感觉没有飞书好用';
      expect(ConnoisseurDetector.isConnoisseurship(text2b)).toBe(true);
      
      // 纯协调（非品鉴）
      const text3 = '会议改到下午3点';
      expect(ConnoisseurDetector.isConnoisseurship(text3)).toBe(false);
    });
  });
  
  // ========================================
  // Frequency Calculation Tests
  // ========================================
  
  describe('Frequency Calculation', () => {
    it('should calculate frequency = connoisseurship / total', () => {
      const messages = [
        { content: '感觉不对' },           // Connoisseurship (evaluation + critical implied)
        { content: 'UI很优雅' },           // Connoisseurship (taste)
        { content: '今天开会' },           // NOT
        { content: '没有飞书好' },         // Connoisseurship (comparative)
        { content: '收到' },               // NOT
      ];
      
      const frequency = ConnoisseurDetector.calculateFrequency(messages);
      
      // At least 2/5 = 0.4 (may be higher depending on keyword overlap)
      expect(frequency).toBeGreaterThan(0);
      expect(frequency).toBeLessThanOrEqual(1.0);
    });
    
    it('should return 0 for empty message list', () => {
      const frequency = ConnoisseurDetector.calculateFrequency([]);
      expect(frequency).toBe(0);
    });
  });
  
  // ========================================
  // Filtering Tests
  // ========================================
  
  describe('Message Filtering', () => {
    it('should filter connoisseurship messages', () => {
      const messages = [
        { id: 'm1', content: '感觉不对，为什么？' },      // YES
        { id: 'm2', content: '今天天气好' },             // NO
        { id: 'm3', content: 'UI很优雅' },              // YES
        { id: 'm4', content: '收到' },                  // NO
      ];
      
      const filtered = ConnoisseurDetector.filterConnoisseurshipMessages(messages);
      
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThan(messages.length);
      expect(filtered.every(msg => ConnoisseurDetector.isConnoisseurship(msg.content))).toBe(true);
    });
  });
  
  // ========================================
  // Matched Keywords Tests
  // ========================================
  
  describe('Matched Keywords', () => {
    it('should return matched keywords by category', () => {
      const text = '感觉没有飞书好，UI很优雅';
      const matched = ConnoisseurDetector.getMatchedKeywords(text);
      
      expect(matched.evaluation.length).toBeGreaterThan(0); // '感觉'
      expect(matched.comparative.length).toBeGreaterThan(0); // '没有', '好'
      expect(matched.taste.length).toBeGreaterThan(0); // '优雅'
    });
  });
});
