/**
 * OCTO-ONA Layer 3: Connoisseurship Score
 * 
 * New 4-metric connoisseurship index system based on Pentland specification.
 * Replaces single Hub Score with multi-dimensional connoisseurship measurement.
 * 
 * Core Metrics:
 * 1. Connoisseurship Density = Connoisseurship Messages / Total Sent
 * 2. Connoisseurship Driving Force = Responded Connoisseurships / Total Connoisseurships
 * 3. Connoisseurship Span = Number of Different Lobsters Engaged
 * 4. Connoisseurship Power = Density × Driving Force × log2(Span + 1)
 * 
 * Key Rule:
 * A connoisseurship message must satisfy BOTH:
 * - Condition 1: Response to a lobster (previousMsg.sender.isBot === true)
 * - Condition 2: Contains judgmental language (keyword matching)
 */

import { Message } from '../layer2/models';
import { ConnoisseurDetector } from './connoisseur-detector';

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

export interface MessageContext {
  message: Message;
  previousMessage?: Message;
  isBot: (uid: string) => boolean;
}

// ============================================
// ConnoisseurshipScoreCalculator Class
// ============================================

export class ConnoisseurshipScoreCalculator {
  private messages: Message[];
  private botUids: Set<string>;
  
  /**
   * @param messages - All messages in the network
   * @param botUids - Set of bot UIDs (to identify lobsters)
   */
  constructor(messages: Message[], botUids: string[]) {
    this.messages = messages;
    this.botUids = new Set(botUids);
  }
  
  /**
   * Check if a UID belongs to a bot (lobster)
   */
  private isBot(uid: string): boolean {
    return this.botUids.has(uid);
  }
  
  /**
   * Build message context with previous message lookup
   * 
   * Creates a map: messageId -> previous message (by timestamp)
   */
  private buildMessageContext(): Map<string, Message | undefined> {
    const context = new Map<string, Message | undefined>();
    
    // Sort messages by timestamp
    const sorted = [...this.messages].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    // For each message, find its previous message
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const previous = i > 0 ? sorted[i - 1] : undefined;
      context.set(current.id, previous);
    }
    
    return context;
  }
  
  /**
   * Check if a message is a connoisseurship message
   * 
   * Must satisfy BOTH conditions:
   * 1. Response to a lobster (previous message sender is bot)
   * 2. Contains judgmental language (ConnoisseurDetector)
   * 
   * @param message - Current message
   * @param previousMessage - Previous message in timeline
   * @returns true if connoisseurship detected
   */
  private isConnoisseurshipMessage(
    message: Message,
    previousMessage?: Message
  ): boolean {
    // Condition 1: Previous message must exist and be from a bot
    if (!previousMessage || !this.isBot(previousMessage.from_uid)) {
      return false;
    }
    
    // Condition 2: Must contain judgmental language
    if (!ConnoisseurDetector.isConnoisseurship(message.content)) {
      return false;
    }
    
    return true;
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
    
    // Build context (previousMessage lookup)
    const context = this.buildMessageContext();
    
    // Identify connoisseurship messages
    const connoisseurshipMessages = userMessages.filter(msg => {
      const prevMsg = context.get(msg.id);
      return this.isConnoisseurshipMessage(msg, prevMsg);
    });
    
    const connoisseurshipCount = connoisseurshipMessages.length;
    
    // Count responded connoisseurships
    const respondedConnoisseurshipCount = connoisseurshipMessages.filter(msg =>
      this.hasLobsterResponse(msg)
    ).length;
    
    // Count unique lobsters engaged
    const lobbersEngaged = new Set<string>();
    for (const msg of connoisseurshipMessages) {
      const prevMsg = context.get(msg.id);
      if (prevMsg && this.isBot(prevMsg.from_uid)) {
        lobbersEngaged.add(prevMsg.from_uid);
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
   * @returns Detailed analysis with message IDs
   */
  getDetailedBreakdown(uid: string): {
    metrics: ConnoisseurshipMetrics;
    connoisseurshipMessageIds: string[];
    respondedMessageIds: string[];
    lobbersEngaged: string[];
  } {
    const userMessages = this.messages.filter(m => m.from_uid === uid);
    const context = this.buildMessageContext();
    
    const connoisseurshipMessages = userMessages.filter(msg => {
      const prevMsg = context.get(msg.id);
      return this.isConnoisseurshipMessage(msg, prevMsg);
    });
    
    const respondedMessages = connoisseurshipMessages.filter(msg =>
      this.hasLobsterResponse(msg)
    );
    
    const lobbersEngaged = new Set<string>();
    for (const msg of connoisseurshipMessages) {
      const prevMsg = context.get(msg.id);
      if (prevMsg && this.isBot(prevMsg.from_uid)) {
        lobbersEngaged.add(prevMsg.from_uid);
      }
    }
    
    return {
      metrics: this.calculateMetrics(uid),
      connoisseurshipMessageIds: connoisseurshipMessages.map(m => m.id),
      respondedMessageIds: respondedMessages.map(m => m.id),
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
