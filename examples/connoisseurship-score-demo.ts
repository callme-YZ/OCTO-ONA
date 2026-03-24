/**
 * OCTO-ONA Connoisseurship Score - Demo Script
 * 
 * Demonstrates the new 4-metric connoisseurship index system (v1.3.0)
 */

import { ConnoisseurshipScoreCalculator, formatMetrics } from '../src/layer3/connoisseurship-score';
import { Message } from '../src/layer2/models';

// ============================================
// Create Demo Data
// ============================================

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

const botUids = ['bot_lobster1', 'bot_lobster2'];

const messages: Message[] = [
  // === Alice (alice) - High connoisseurship ===
  // Engage with lobster1
  createMessage('m1', 'bot_lobster1', ['huige'], 'Feature X ready', new Date('2024-01-01T10:00:00Z')),
  createMessage('m2', 'huige', ['bot_lobster1'], '感觉不对，UI不够优雅', new Date('2024-01-01T10:01:00Z')),
  createMessage('m3', 'bot_lobster1', ['huige'], 'Will improve', new Date('2024-01-01T10:02:00Z')),
  
  // Engage with lobster2
  createMessage('m4', 'bot_lobster2', ['huige'], 'API design', new Date('2024-01-01T10:03:00Z')),
  createMessage('m5', 'huige', ['bot_lobster2'], '为什么这样设计？相比之前的版本复杂很多', new Date('2024-01-01T10:04:00Z')),
  createMessage('m6', 'bot_lobster2', ['huige'], 'Let me explain', new Date('2024-01-01T10:05:00Z')),
  
  // Another high-quality connoisseurship
  createMessage('m7', 'bot_lobster1', ['huige'], 'Check this', new Date('2024-01-01T11:00:00Z')),
  createMessage('m8', 'huige', ['bot_lobster1'], '应该更简洁，不够直观', new Date('2024-01-01T11:01:00Z')),
  createMessage('m9', 'bot_lobster1', ['huige'], 'Noted', new Date('2024-01-01T11:02:00Z')),
  
  // === 小王 (xiaowang) - Low connoisseurship ===
  createMessage('m10', 'bot_lobster1', ['xiaowang'], 'Task assigned', new Date('2024-01-01T10:06:00Z')),
  createMessage('m11', 'xiaowang', ['bot_lobster1'], '收到', new Date('2024-01-01T10:07:00Z')),
  
  createMessage('m12', 'bot_lobster1', ['xiaowang'], 'Update?', new Date('2024-01-01T10:08:00Z')),
  createMessage('m13', 'xiaowang', ['bot_lobster1'], '正在处理', new Date('2024-01-01T10:09:00Z')),
  
  createMessage('m14', 'bot_lobster1', ['xiaowang'], 'Done?', new Date('2024-01-01T10:10:00Z')),
  createMessage('m15', 'xiaowang', ['bot_lobster1'], '完成了', new Date('2024-01-01T10:11:00Z')),
  
  // === Bot-to-bot (should have zero power) ===
  createMessage('m16', 'bot_lobster1', ['bot_lobster2'], 'Data ready', new Date('2024-01-01T12:00:00Z')),
  createMessage('m17', 'bot_lobster2', ['bot_lobster1'], '感觉不错', new Date('2024-01-01T12:01:00Z')),
];

// ============================================
// Calculate Metrics
// ============================================

const calculator = new ConnoisseurshipScoreCalculator(messages, botUids);

console.log('='.repeat(70));
console.log('OCTO-ONA Connoisseurship Score Demo (v1.3.0)');
console.log('='.repeat(70));
console.log();

// 1. All users metrics
console.log('📊 All Users Metrics:');
console.log('-'.repeat(70));

const allMetrics = calculator.calculateAllMetrics();
for (const [uid, metrics] of Object.entries(allMetrics)) {
  console.log(`\n[${uid}]`);
  console.log(formatMetrics(metrics));
}

// 2. Top by power
console.log('\n' + '='.repeat(70));
console.log('🏆 Top Users by Connoisseurship Power:');
console.log('-'.repeat(70));

const topUsers = calculator.getTopByPower(10);
topUsers.forEach(([uid, metrics], index) => {
  console.log(`${index + 1}. ${uid} - Power: ${metrics.power.toFixed(4)}`);
});

// 3. Verification
console.log('\n' + '='.repeat(70));
console.log('✅ System Verification:');
console.log('-'.repeat(70));

const verification = calculator.verifyBotsHaveZeroPower();
console.log(`All bots have zero power: ${verification.allBotsZero ? '✅ PASS' : '❌ FAIL'}`);

for (const [botUid, power] of Object.entries(verification.botMetrics)) {
  console.log(`  - ${botUid}: ${power}`);
}

// 4. Detailed breakdown for top user
console.log('\n' + '='.repeat(70));
console.log('🔍 Detailed Breakdown (Alice):');
console.log('-'.repeat(70));

const huigeBreakdown = calculator.getDetailedBreakdown('huige');
console.log(formatMetrics(huigeBreakdown.metrics));
console.log(`\nConnoisseurship Message IDs: ${huigeBreakdown.connoisseurshipMessageIds.join(', ')}`);
console.log(`Responded Message IDs: ${huigeBreakdown.respondedMessageIds.join(', ')}`);
console.log(`Lobsters Engaged: ${huigeBreakdown.lobbersEngaged.join(', ')}`);

console.log('\n' + '='.repeat(70));
console.log('Demo completed!');
console.log('='.repeat(70));
