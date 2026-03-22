/**
 * Layer 3 ConnoisseurshipScore - Unit Tests
 * 
 * Tests for the new 4-metric connoisseurship index system (v1.3.0)
 */

import { ConnoisseurshipScoreCalculator, formatMetrics, compareUsers } from '../src/layer3/connoisseurship-score';
import { Message } from '../src/layer2/models';

describe('Layer 3: ConnoisseurshipScore', () => {
  
  // ========================================
  // Test Data Setup
  // ========================================
  
  const createMessage = (
    id: string,
    from_uid: string,
    to_uids: string[],
    content: string,
    timestamp: Date
  ): Message => ({
    id,
    from_uid,
    to_uids,
    content,
    timestamp,
  });
  
  // ========================================
  // Basic Metrics Calculation Tests
  // ========================================
  
  describe('Basic Metrics Calculation', () => {
    it('should calculate density correctly', () => {
      const botUids = ['bot1'];
      const messages: Message[] = [
        // Bot message first
        createMessage('m1', 'bot1', ['user1'], 'Hello', new Date('2024-01-01T10:00:00Z')),
        // User responds with connoisseurship (evaluative + critical = 2)
        createMessage('m2', 'user1', ['bot1'], '感觉不对，为什么这样？', new Date('2024-01-01T10:01:00Z')),
        // User normal message
        createMessage('m3', 'user1', ['bot1'], '收到', new Date('2024-01-01T10:02:00Z')),
      ];
      
      const calculator = new ConnoisseurshipScoreCalculator(messages, botUids);
      const metrics = calculator.calculateMetrics('user1');
      
      // user1 sent 2 messages, 1 is connoisseurship
      expect(metrics.totalSent).toBe(2);
      expect(metrics.connoisseurshipCount).toBe(1);
      expect(metrics.density).toBeCloseTo(0.5, 2); // 1/2 = 0.5
    });
    
    it('should calculate driving force correctly', () => {
      const botUids = ['bot1'];
      const messages: Message[] = [
        // Bot message
        createMessage('m1', 'bot1', ['user1'], 'Hello', new Date('2024-01-01T10:00:00Z')),
        // User connoisseurship
        createMessage('m2', 'user1', ['bot1'], '感觉不对，为什么？', new Date('2024-01-01T10:01:00Z')),
        // Bot responds (within 24h)
        createMessage('m3', 'bot1', ['user1'], 'I see', new Date('2024-01-01T10:02:00Z')),
        
        // Another bot message
        createMessage('m4', 'bot1', ['user1'], 'Test', new Date('2024-01-01T11:00:00Z')),
        // User connoisseurship (no response)
        createMessage('m5', 'user1', ['bot1'], 'UI很优雅', new Date('2024-01-01T11:01:00Z')),
      ];
      
      const calculator = new ConnoisseurshipScoreCalculator(messages, botUids);
      const metrics = calculator.calculateMetrics('user1');
      
      // user1 has 2 connoisseurships, 1 got response
      expect(metrics.connoisseurshipCount).toBe(2);
      expect(metrics.respondedConnoisseurshipCount).toBe(1);
      expect(metrics.drivingForce).toBeCloseTo(0.5, 2); // 1/2 = 0.5
    });
    
    it('should calculate span correctly', () => {
      const botUids = ['bot1', 'bot2', 'bot3'];
      const messages: Message[] = [
        // Engage with bot1
        createMessage('m1', 'bot1', ['user1'], 'Hello', new Date('2024-01-01T10:00:00Z')),
        createMessage('m2', 'user1', ['bot1'], '感觉不对，为什么？', new Date('2024-01-01T10:01:00Z')),
        
        // Engage with bot2
        createMessage('m3', 'bot2', ['user1'], 'Hi', new Date('2024-01-01T10:02:00Z')),
        createMessage('m4', 'user1', ['bot2'], 'UI很优雅', new Date('2024-01-01T10:03:00Z')),
        
        // Engage with bot1 again (should not increase span)
        createMessage('m5', 'bot1', ['user1'], 'Test', new Date('2024-01-01T10:04:00Z')),
        createMessage('m6', 'user1', ['bot1'], '觉得还可以，比较好', new Date('2024-01-01T10:05:00Z')),
      ];
      
      const calculator = new ConnoisseurshipScoreCalculator(messages, botUids);
      const metrics = calculator.calculateMetrics('user1');
      
      // user1 engaged with 2 different bots
      expect(metrics.span).toBe(2);
      expect(metrics.uniqueLobbersEngaged).toBe(2);
    });
    
    it('should calculate power correctly', () => {
      const botUids = ['bot1'];
      const messages: Message[] = [
        createMessage('m1', 'bot1', ['user1'], 'Hello', new Date('2024-01-01T10:00:00Z')),
        createMessage('m2', 'user1', ['bot1'], '感觉不对，为什么？', new Date('2024-01-01T10:01:00Z')),
        createMessage('m3', 'bot1', ['user1'], 'OK', new Date('2024-01-01T10:02:00Z')),
      ];
      
      const calculator = new ConnoisseurshipScoreCalculator(messages, botUids);
      const metrics = calculator.calculateMetrics('user1');
      
      // density = 1/1 = 1.0
      // drivingForce = 1/1 = 1.0
      // span = 1
      // power = 1.0 * 1.0 * log2(1+1) = 1.0 * 1.0 * 1.0 = 1.0
      expect(metrics.density).toBe(1.0);
      expect(metrics.drivingForce).toBe(1.0);
      expect(metrics.span).toBe(1);
      expect(metrics.power).toBeCloseTo(1.0, 2);
    });
  });
  
  // ========================================
  // Edge Cases Tests
  // ========================================
  
  describe('Edge Cases', () => {
    it('should handle user with no messages', () => {
      const botUids = ['bot1'];
      const messages: Message[] = [];
      
      const calculator = new ConnoisseurshipScoreCalculator(messages, botUids);
      const metrics = calculator.calculateMetrics('user1');
      
      expect(metrics.totalSent).toBe(0);
      expect(metrics.connoisseurshipCount).toBe(0);
      expect(metrics.density).toBe(0);
      expect(metrics.drivingForce).toBe(0);
      expect(metrics.span).toBe(0);
      expect(metrics.power).toBe(0);
    });
    
    it('should handle user with only normal messages (no connoisseurship)', () => {
      const botUids = ['bot1'];
      const messages: Message[] = [
        createMessage('m1', 'bot1', ['user1'], 'Hello', new Date('2024-01-01T10:00:00Z')),
        createMessage('m2', 'user1', ['bot1'], '收到', new Date('2024-01-01T10:01:00Z')),
        createMessage('m3', 'user1', ['bot1'], 'OK', new Date('2024-01-01T10:02:00Z')),
      ];
      
      const calculator = new ConnoisseurshipScoreCalculator(messages, botUids);
      const metrics = calculator.calculateMetrics('user1');
      
      expect(metrics.totalSent).toBe(2);
      expect(metrics.connoisseurshipCount).toBe(0);
      expect(metrics.density).toBe(0);
      expect(metrics.power).toBe(0);
    });
    
    it('should handle connoisseurship without bot response', () => {
      const botUids = ['bot1'];
      const messages: Message[] = [
        createMessage('m1', 'bot1', ['user1'], 'Hello', new Date('2024-01-01T10:00:00Z')),
        createMessage('m2', 'user1', ['bot1'], '感觉不对，为什么？', new Date('2024-01-01T10:01:00Z')),
        // No bot response
      ];
      
      const calculator = new ConnoisseurshipScoreCalculator(messages, botUids);
      const metrics = calculator.calculateMetrics('user1');
      
      expect(metrics.connoisseurshipCount).toBe(1);
      expect(metrics.respondedConnoisseurshipCount).toBe(0);
      expect(metrics.drivingForce).toBe(0);
    });
    
    it('should NOT count connoisseurship if previous message is not from bot', () => {
      const botUids = ['bot1'];
      const messages: Message[] = [
        // User-to-user conversation
        createMessage('m1', 'user2', ['user1'], 'Hello', new Date('2024-01-01T10:00:00Z')),
        createMessage('m2', 'user1', ['user2'], '感觉不对，为什么？', new Date('2024-01-01T10:01:00Z')),
      ];
      
      const calculator = new ConnoisseurshipScoreCalculator(messages, botUids);
      const metrics = calculator.calculateMetrics('user1');
      
      // Should NOT count as connoisseurship (condition 1 failed)
      expect(metrics.connoisseurshipCount).toBe(0);
      expect(metrics.power).toBe(0);
    });
  });
  
  // ========================================
  // Verification Tests (Acceptance Criteria)
  // ========================================
  
  describe('Verification Tests', () => {
    it('should verify all bots have zero power', () => {
      const botUids = ['bot1', 'bot2'];
      const messages: Message[] = [
        // Bot-to-bot conversation
        createMessage('m1', 'bot1', ['bot2'], 'Hello', new Date('2024-01-01T10:00:00Z')),
        createMessage('m2', 'bot2', ['bot1'], '感觉不对', new Date('2024-01-01T10:01:00Z')),
        
        // Bot-to-user
        createMessage('m3', 'bot1', ['user1'], 'Test', new Date('2024-01-01T10:02:00Z')),
        createMessage('m4', 'user1', ['bot1'], 'OK', new Date('2024-01-01T10:03:00Z')),
      ];
      
      const calculator = new ConnoisseurshipScoreCalculator(messages, botUids);
      const verification = calculator.verifyBotsHaveZeroPower();
      
      expect(verification.allBotsZero).toBe(true);
      expect(verification.botMetrics['bot1']).toBe(0);
      expect(verification.botMetrics['bot2']).toBe(0);
    });
    
    it('should rank users by power correctly', () => {
      const botUids = ['bot1'];
      const messages: Message[] = [
        // User1: high connoisseurship power
        createMessage('m1', 'bot1', ['user1'], 'H1', new Date('2024-01-01T10:00:00Z')),
        createMessage('m2', 'user1', ['bot1'], '感觉不对，为什么？', new Date('2024-01-01T10:01:00Z')),
        createMessage('m3', 'bot1', ['user1'], 'R1', new Date('2024-01-01T10:02:00Z')),
        
        createMessage('m4', 'bot1', ['user1'], 'H2', new Date('2024-01-01T10:03:00Z')),
        createMessage('m5', 'user1', ['bot1'], 'UI很优雅', new Date('2024-01-01T10:04:00Z')),
        createMessage('m6', 'bot1', ['user1'], 'R2', new Date('2024-01-01T10:05:00Z')),
        
        // User2: low connoisseurship power
        createMessage('m7', 'bot1', ['user2'], 'H3', new Date('2024-01-01T10:06:00Z')),
        createMessage('m8', 'user2', ['bot1'], '收到', new Date('2024-01-01T10:07:00Z')),
        createMessage('m9', 'user2', ['bot1'], 'OK', new Date('2024-01-01T10:08:00Z')),
      ];
      
      const calculator = new ConnoisseurshipScoreCalculator(messages, botUids);
      const topUsers = calculator.getTopByPower(10);
      
      // Should have 3 users: user1, user2, bot1
      expect(topUsers.length).toBe(3);
      // user1 should rank first
      expect(topUsers[0][0]).toBe('user1');
      // user1 power > user2 power
      expect(topUsers[0][1].power).toBeGreaterThan(topUsers[1][1].power);
      // bot1 should have 0 power (rank last)
      const botEntry = topUsers.find(([uid]) => uid === 'bot1');
      expect(botEntry).toBeDefined();
      expect(botEntry![1].power).toBe(0);
    });
  });
  
  // ========================================
  // Integration Tests
  // ========================================
  
  describe('Integration Tests', () => {
    it('should calculate metrics for all users', () => {
      const botUids = ['bot1'];
      const messages: Message[] = [
        createMessage('m1', 'bot1', ['user1'], 'H1', new Date('2024-01-01T10:00:00Z')),
        createMessage('m2', 'user1', ['bot1'], '感觉不对', new Date('2024-01-01T10:01:00Z')),
        createMessage('m3', 'user2', ['bot1'], '收到', new Date('2024-01-01T10:02:00Z')),
      ];
      
      const calculator = new ConnoisseurshipScoreCalculator(messages, botUids);
      const allMetrics = calculator.calculateAllMetrics();
      
      expect(Object.keys(allMetrics).length).toBe(3); // user1, user2, bot1
      expect(allMetrics['user1']).toBeDefined();
      expect(allMetrics['user2']).toBeDefined();
      expect(allMetrics['bot1']).toBeDefined();
    });
    
    it('should get detailed breakdown for debugging', () => {
      const botUids = ['bot1'];
      const messages: Message[] = [
        createMessage('m1', 'bot1', ['user1'], 'H', new Date('2024-01-01T10:00:00Z')),
        createMessage('m2', 'user1', ['bot1'], '感觉不对，为什么？', new Date('2024-01-01T10:01:00Z')),
        createMessage('m3', 'bot1', ['user1'], 'R', new Date('2024-01-01T10:02:00Z')),
      ];
      
      const calculator = new ConnoisseurshipScoreCalculator(messages, botUids);
      const breakdown = calculator.getDetailedBreakdown('user1');
      
      expect(breakdown.metrics).toBeDefined();
      expect(breakdown.connoisseurshipMessageIds).toContain('m2');
      expect(breakdown.respondedMessageIds).toContain('m2');
      expect(breakdown.lobbersEngaged).toContain('bot1');
    });
  });
  
  // ========================================
  // Utility Functions Tests
  // ========================================
  
  describe('Utility Functions', () => {
    it('should format metrics for display', () => {
      const metrics = {
        totalSent: 10,
        connoisseurshipCount: 5,
        respondedConnoisseurshipCount: 3,
        uniqueLobbersEngaged: 2,
        density: 0.5,
        drivingForce: 0.6,
        span: 2,
        power: 0.6,
      };
      
      const formatted = formatMetrics(metrics);
      
      expect(formatted).toContain('Total Sent: 10');
      expect(formatted).toContain('Density: 50.00%');
      expect(formatted).toContain('Power: 0.6000');
    });
    
    it('should compare two users', () => {
      const allMetrics = {
        'user1': {
          totalSent: 10,
          connoisseurshipCount: 5,
          respondedConnoisseurshipCount: 3,
          uniqueLobbersEngaged: 2,
          density: 0.5,
          drivingForce: 0.6,
          span: 2,
          power: 0.6,
        },
        'user2': {
          totalSent: 10,
          connoisseurshipCount: 2,
          respondedConnoisseurshipCount: 1,
          uniqueLobbersEngaged: 1,
          density: 0.2,
          drivingForce: 0.5,
          span: 1,
          power: 0.1,
        },
      };
      
      const comparison = compareUsers('user1', 'user2', allMetrics);
      
      expect(comparison.winner).toBe('user1');
      expect(comparison.powerDiff).toBeGreaterThan(0);
    });
  });
});
