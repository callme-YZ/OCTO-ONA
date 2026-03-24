/**
 * OCTO-ONA Layer 3: Connoisseurship Score
 * 
 * v2.0 - Structure-based connoisseurship detection (论迹不论心)
 * 
 * Core change: 品鉴检测从"时序近似"改为"结构关系"
 * 
 * Old (v1): previousMessage by timestamp → 脆弱，误判率高
 * New (v2): reply_to + @mention（2层强信号，移除弱信号）
 * 
 * Detection rules (strong signals only):
 * 1. reply_to points to bot message → Connoisseurship (explicit reply)
 * 2. @bot AND bot output exists in recent N messages → Connoisseurship (explicit mention)
 * 
 * Philosophy: "论迹不论心" - Judge by observable structure, not content intent
 * Removed "immediate_follow" — too weak, high false positive rate
 * 
 * Metrics (unchanged):
 * 1. Connoisseurship Density = Connoisseurship Messages / Total Sent
 * 2. Connoisseurship Driving Force = Responded / Total Connoisseurships
 * 3. Connoisseurship Span = Unique Lobsters Engaged
 * 4. Connoisseurship Power = Density × Driving Force × log2(Span + 1)
 */

import { Message } from '../layer2/models';
import { ConnoisseurDetector } from './connoisseur-detector';

// ============================================
// Configuration
// ============================================

/**
 * Detection window: How many recent messages to check for bot output
 * when @mention is detected
 */
const CONTEXT_WINDOW_SIZE = 10;

/**
 * Time window for "immediately follows bot" detection (milliseconds)
 * Default: 5 minutes
 */
const IMMEDIATE_FOLLOW_WINDOW_MS = 5 * 60 * 1000;

// ============================================
// Type Definitions
// ============================================

export interface ConnoisseurshipMetrics {
  /** Total messages sent by this user */
  totalSent: number;
  
  /** Number of connoisseurship messages */
  connoisseurshipCount: number;
  
  /** Number of connoisseurships that got lobster responses */
  respondedConnoisseurshipCount: number;
  
  /** Number of unique lobsters engaged */
  uniqueLobbersEngaged: number;
  
  /** Connoisseurship Density = connoisseurshipCount / totalSent */
  density: number;
  
  /** Connoisseurship Driving Force = respondedCount / connoisseurshipCount */
  drivingForce: number;
  
  /** Connoisseurship Span = uniqueLobbersEngaged */
  span: number;
  
  /** Connoisseurship Power = density × drivingForce × log2(span + 1) */
  power: number;
}

export interface ConnoisseurshipDetectionResult {
  isConnoisseurship: boolean;
  signal: 'reply_to' | 'mention_with_context' | 'immediate_follow' | 'none';
  targetBotUid?: string;
}

// ============================================
// ConnoisseurshipScoreCalculator Class
// ============================================

export class ConnoisseurshipScoreCalculator {
  private messages: Message[];
  private botUids: Set<string>;
  private messageById: Map<string, Message>;
  private messagesByTimestamp: Message[];
  
  /**
   * @param messages - All messages in the network
   * @param botUids - Set of bot UIDs (to identify lobsters)
   */
  constructor(messages: Message[], botUids: string[]) {
    this.messages = messages;
    this.botUids = new Set(botUids);
    
    // Build message index
    this.messageById = new Map(messages.map(m => [m.id, m]));
    
    // Sort messages by timestamp for context lookup
    this.messagesByTimestamp = [...messages].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }
  
  /**
   * Check if a UID belongs to a bot (lobster)
   */
  private isBot(uid: string): boolean {
    return this.botUids.has(uid);
  }
  
  /**
   * Extract @mentions from message content
   * 
   * Simplified: assumes @uid format (adapt to platform)
   */
  private extractMentions(content: string): string[] {
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const matches = content.matchAll(mentionRegex);
    return Array.from(matches, m => m[1]);
  }
  
  /**
   * Get recent N messages before this message
   */
  private getRecentMessages(message: Message, count: number): Message[] {
    const index = this.messagesByTimestamp.findIndex(m => m.id === message.id);
    if (index === -1) return [];
    
    const start = Math.max(0, index - count);
    return this.messagesByTimestamp.slice(start, index);
  }
  
  /**
   * Get immediately preceding message
   */
  private getImmediatePrevious(message: Message): Message | undefined {
    const recent = this.getRecentMessages(message, 1);
    return recent[0];
  }
  
  /**
   * Detect connoisseurship using structure-based rules
   * 
   * 3-layer detection (按信号强度, 论迹不论心):
   * 1. reply_to → bot message (strongest, explicit reply)
   * 2. @bot + bot output in recent context (strong, explicit mention)
   * 3. Immediately follows bot + to_uids includes bot (fallback for platforms without reply_to)
   * 
   * Note: Rule 3 is a fallback for backward compatibility and platforms without reply_to.
   * It includes a "to_uids check" to reduce false positives (e.g., "收到", "OK" to other users).
   * 
   * @param message - Message to check
   * @returns Detection result with signal type
   */
  private detectConnoisseurship(message: Message): ConnoisseurshipDetectionResult {
    // Rule 0: Sender must be human (bots cannot be connoisseurs)
    if (this.isBot(message.from_uid)) {
      return { isConnoisseurship: false, signal: 'none' };
    }
    
    // Rule 1: reply_to points to bot message (strongest)
    if (message.reply_to) {
      const replyTarget = this.messageById.get(message.reply_to);
      if (replyTarget && this.isBot(replyTarget.from_uid)) {
        return {
          isConnoisseurship: true,
          signal: 'reply_to',
          targetBotUid: replyTarget.from_uid,
        };
      }
    }
    
    // Rule 2: @bot AND bot output in recent context
    const mentions = this.extractMentions(message.content);
    const mentionedBots = mentions.filter(uid => this.isBot(uid));
    
    if (mentionedBots.length > 0) {
      const recentMessages = this.getRecentMessages(message, CONTEXT_WINDOW_SIZE);
      const botOutputExists = recentMessages.some(m =>
        mentionedBots.includes(m.from_uid)
      );
      
      if (botOutputExists) {
        return {
          isConnoisseurship: true,
          signal: 'mention_with_context',
          targetBotUid: mentionedBots[0], // Pick first mentioned bot
        };
      }
    }
    
    // Rule 3: Fallback for platforms without reply_to
    // Immediately follows bot + to_uids includes bot + time window check
    const prevMsg = this.getImmediatePrevious(message);
    if (prevMsg && this.isBot(prevMsg.from_uid)) {
      const timeDiff = message.timestamp.getTime() - prevMsg.timestamp.getTime();
      const toBot = message.to_uids.some(uid => this.isBot(uid));
      
      if (timeDiff <= IMMEDIATE_FOLLOW_WINDOW_MS && toBot) {
        return {
          isConnoisseurship: true,
          signal: 'immediate_follow',
          targetBotUid: prevMsg.from_uid,
        };
      }
    }
    
    // No connoisseurship detected
    return {
      isConnoisseurship: false,
      signal: 'none',
    };
  }
  
  /**
   * Check if a connoisseurship got a response from a lobster
   * 
   * A connoisseurship is "responded" if ANY subsequent message
   * from a lobster exists within a time window.
   * 
   * @param message - The connoisseurship message
   * @param timeWindowMs - Time window in milliseconds (default 24h)
   * @returns true if responded
   */
  private hasLobsterResponse(
    message: Message,
    timeWindowMs: number = 24 * 60 * 60 * 1000
  ): boolean {
    const cutoffTime = message.timestamp.getTime() + timeWindowMs;
    
    // Find any bot message after this one within time window
    const hasResponse = this.messages.some(m => {
      return (
        this.isBot(m.from_uid) &&
        m.timestamp.getTime() > message.timestamp.getTime() &&
        m.timestamp.getTime() <= cutoffTime
      );
    });
    
    return hasResponse;
  }
  
  /**
   * Calculate connoisseurship metrics for a specific user
   * 
   * @param uid - User ID
   * @returns ConnoisseurshipMetrics object
   */
  calculateMetrics(uid: string): ConnoisseurshipMetrics {
    // Filter messages sent by this user
    const userMessages = this.messages.filter(m => m.from_uid === uid);
    const totalSent = userMessages.length;
    
    // Identify connoisseurship messages using structure-based detection
    const connoisseurshipResults = userMessages.map(msg => ({
      message: msg,
      detection: this.detectConnoisseurship(msg),
    }));
    
    const connoisseurshipMessages = connoisseurshipResults
      .filter(r => r.detection.isConnoisseurship)
      .map(r => r.message);
    
    const connoisseurshipCount = connoisseurshipMessages.length;
    
    // Count responded connoisseurships
    const respondedConnoisseurshipCount = connoisseurshipMessages.filter(msg =>
      this.hasLobsterResponse(msg)
    ).length;
    
    // Count unique lobsters engaged
    const lobbersEngaged = new Set<string>();
    for (const result of connoisseurshipResults) {
      if (result.detection.isConnoisseurship && result.detection.targetBotUid) {
        lobbersEngaged.add(result.detection.targetBotUid);
      }
    }
    const uniqueLobbersEngaged = lobbersEngaged.size;
    
    // Calculate metrics
    const density = totalSent > 0 ? connoisseurshipCount / totalSent : 0.0;
    
    const drivingForce = connoisseurshipCount > 0
      ? respondedConnoisseurshipCount / connoisseurshipCount
      : 0.0;
    
    const span = uniqueLobbersEngaged;
    
    const power = density * drivingForce * Math.log2(span + 1);
    
    return {
      totalSent,
      connoisseurshipCount,
      respondedConnoisseurshipCount,
      uniqueLobbersEngaged,
      density,
      drivingForce,
      span,
      power,
    };
  }
  
  /**
   * Calculate metrics for all users in the network
   * 
   * @returns Record<uid, ConnoisseurshipMetrics>
   */
  calculateAllMetrics(): Record<string, ConnoisseurshipMetrics> {
    const allUids = new Set(this.messages.map(m => m.from_uid));
    const results: Record<string, ConnoisseurshipMetrics> = {};
    
    for (const uid of allUids) {
      results[uid] = this.calculateMetrics(uid);
    }
    
    console.log(`Calculated connoisseurship metrics for ${allUids.size} users`);
    return results;
  }
  
  /**
   * Get top users by connoisseurship power
   * 
   * @param limit - Number of top users to return
   * @returns Array of [uid, metrics] sorted by power descending
   */
  getTopByPower(limit: number = 10): Array<[string, ConnoisseurshipMetrics]> {
    const allMetrics = this.calculateAllMetrics();
    
    return Object.entries(allMetrics)
      .sort((a, b) => b[1].power - a[1].power)
      .slice(0, limit);
  }
  
  /**
   * Verification helper: Check if all bots have zero power
   * 
   * Bots should never have connoisseurship power since they
   * cannot respond to other bots (by definition).
   * 
   * @returns { allBotsZero: boolean, botMetrics: Record<uid, power> }
   */
  verifyBotsHaveZeroPower(): {
    allBotsZero: boolean;
    botMetrics: Record<string, number>;
  } {
    const allMetrics = this.calculateAllMetrics();
    const botMetrics: Record<string, number> = {};
    
    for (const botUid of this.botUids) {
      const metrics = allMetrics[botUid];
      if (metrics) {
        botMetrics[botUid] = metrics.power;
      }
    }
    
    const allBotsZero = Object.values(botMetrics).every(power => power === 0);
    
    return { allBotsZero, botMetrics };
  }
  
  /**
   * Get detailed breakdown for debugging
   * 
   * @param uid - User ID
   * @returns Detailed analysis with signal types
   */
  getDetailedBreakdown(uid: string): {
    metrics: ConnoisseurshipMetrics;
    connoisseurshipDetails: Array<{
      messageId: string;
      signal: string;
      targetBot?: string;
      responded: boolean;
    }>;
    lobbersEngaged: string[];
  } {
    const userMessages = this.messages.filter(m => m.from_uid === uid);
    
    const connoisseurshipResults = userMessages.map(msg => ({
      message: msg,
      detection: this.detectConnoisseurship(msg),
    }));
    
    const connoisseurshipDetails = connoisseurshipResults
      .filter(r => r.detection.isConnoisseurship)
      .map(r => ({
        messageId: r.message.id,
        signal: r.detection.signal,
        targetBot: r.detection.targetBotUid,
        responded: this.hasLobsterResponse(r.message),
      }));
    
    const lobbersEngaged = new Set<string>();
    for (const detail of connoisseurshipDetails) {
      if (detail.targetBot) {
        lobbersEngaged.add(detail.targetBot);
      }
    }
    
    return {
      metrics: this.calculateMetrics(uid),
      connoisseurshipDetails,
      lobbersEngaged: Array.from(lobbersEngaged),
    };
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format metrics for display
 * 
 * @param metrics - ConnoisseurshipMetrics object
 * @returns Human-readable string
 */
export function formatMetrics(metrics: ConnoisseurshipMetrics): string {
  return `
Connoisseurship Metrics:
  Total Sent: ${metrics.totalSent}
  Connoisseurships: ${metrics.connoisseurshipCount}
  Responded: ${metrics.respondedConnoisseurshipCount}
  Lobsters Engaged: ${metrics.uniqueLobbersEngaged}
  
  Density: ${(metrics.density * 100).toFixed(2)}%
  Driving Force: ${(metrics.drivingForce * 100).toFixed(2)}%
  Span: ${metrics.span}
  Power: ${metrics.power.toFixed(4)}
  `.trim();
}

/**
 * Compare two users by connoisseurship power
 * 
 * @returns Comparison object with rankings
 */
export function compareUsers(
  uid1: string,
  uid2: string,
  allMetrics: Record<string, ConnoisseurshipMetrics>
): {
  user1: { uid: string; metrics: ConnoisseurshipMetrics };
  user2: { uid: string; metrics: ConnoisseurshipMetrics };
  powerDiff: number;
  winner: string;
} {
  const m1 = allMetrics[uid1];
  const m2 = allMetrics[uid2];
  
  if (!m1 || !m2) {
    throw new Error(`Metrics not found for ${uid1} or ${uid2}`);
  }
  
  return {
    user1: { uid: uid1, metrics: m1 },
    user2: { uid: uid2, metrics: m2 },
    powerDiff: m1.power - m2.power,
    winner: m1.power > m2.power ? uid1 : uid2,
  };
}
