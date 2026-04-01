/**
 * Bot Ownership Detector
 * 
 * Infers bot ownership from message patterns in DMWork data.
 * 
 * Detection strategies:
 * 1. Direct messages: User who has most DM conversations with bot
 * 2. Mentions: User who mentions the bot most frequently
 * 3. Replies: User who replies to bot messages most often
 * 
 * @module layer7/bot-ownership
 */

import mysql from 'mysql2/promise';

export interface BotOwnershipCandidate {
  userId: string;
  botId: string;
  sourceId: string;
  confidence: number; // 0-1
  evidence: {
    dmCount?: number;
    mentionCount?: number;
    replyCount?: number;
  };
}

export interface DetectionOptions {
  sourceId: string;
  minConfidence?: number; // Default: 0.5
  minInteractions?: number; // Default: 10
}

export class BotOwnershipDetector {
  constructor(private db: mysql.Connection) {}

  /**
   * Detect bot ownership for all bots in a data source
   */
  async detectAll(options: DetectionOptions): Promise<BotOwnershipCandidate[]> {
    const { sourceId, minConfidence = 0.5, minInteractions = 10 } = options;

    // Get all bots from this source
    const [bots] = await this.db.query<any[]>(
      'SELECT uid FROM users WHERE source_id = ? AND is_bot = 1',
      [sourceId]
    );

    const candidates: BotOwnershipCandidate[] = [];

    for (const bot of bots) {
      const candidate = await this.detectForBot(bot.uid, sourceId, minInteractions);
      if (candidate && candidate.confidence >= minConfidence) {
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  /**
   * Detect ownership for a specific bot
   */
  async detectForBot(
    botId: string,
    sourceId: string,
    minInteractions: number = 10
  ): Promise<BotOwnershipCandidate | null> {
    // Strategy 1: Find user with most DM conversations with bot
    const dmCandidate = await this.detectFromDMs(botId, sourceId);

    // Strategy 2: Find user who mentions bot most
    const mentionCandidate = await this.detectFromMentions(botId, sourceId);

    // Strategy 3: Find user who replies to bot most
    const replyCandidate = await this.detectFromReplies(botId, sourceId);

    // Combine evidence
    const combined = this.combineEvidence(
      [dmCandidate, mentionCandidate, replyCandidate].filter(Boolean) as any[]
    );

    if (!combined) return null;

    // Check minimum interactions
    const totalInteractions =
      (combined.evidence.dmCount || 0) +
      (combined.evidence.mentionCount || 0) +
      (combined.evidence.replyCount || 0);

    if (totalInteractions < minInteractions) return null;

    return combined;
  }

  /**
   * Strategy 1: Detect from DM conversations
   */
  private async detectFromDMs(
    botId: string,
    sourceId: string
  ): Promise<Partial<BotOwnershipCandidate> | null> {
    const [rows] = await this.db.query<any[]>(
      `
      SELECT 
        CASE 
          WHEN from_uid = ? THEN 
            (SELECT from_uid FROM messages m2 
             WHERE m2.channel_id = m.channel_id 
               AND m2.from_uid != ? 
             LIMIT 1)
          ELSE from_uid
        END as user_id,
        COUNT(*) as dm_count
      FROM messages m
      JOIN channels c ON m.channel_id = c.channel_id
      WHERE c.type = 'dm'
        AND c.source_id = ?
        AND (m.from_uid = ? OR m.reply_to_uid = ?)
      GROUP BY user_id
      HAVING user_id IS NOT NULL
      ORDER BY dm_count DESC
      LIMIT 1
      `,
      [botId, botId, sourceId, botId, botId]
    );

    if (rows.length === 0) return null;

    return {
      userId: rows[0].user_id,
      botId,
      sourceId,
      evidence: { dmCount: rows[0].dm_count },
    };
  }

  /**
   * Strategy 2: Detect from mentions
   */
  private async detectFromMentions(
    botId: string,
    sourceId: string
  ): Promise<Partial<BotOwnershipCandidate> | null> {
    const [rows] = await this.db.query<any[]>(
      `
      SELECT 
        from_uid as user_id,
        COUNT(*) as mention_count
      FROM messages
      WHERE source_id = ?
        AND JSON_CONTAINS(mentioned_uids, ?)
      GROUP BY from_uid
      ORDER BY mention_count DESC
      LIMIT 1
      `,
      [sourceId, JSON.stringify(botId)]
    );

    if (rows.length === 0) return null;

    return {
      userId: rows[0].user_id,
      botId,
      sourceId,
      evidence: { mentionCount: rows[0].mention_count },
    };
  }

  /**
   * Strategy 3: Detect from replies
   */
  private async detectFromReplies(
    botId: string,
    sourceId: string
  ): Promise<Partial<BotOwnershipCandidate> | null> {
    const [rows] = await this.db.query<any[]>(
      `
      SELECT 
        from_uid as user_id,
        COUNT(*) as reply_count
      FROM messages
      WHERE source_id = ?
        AND reply_to_uid = ?
      GROUP BY from_uid
      ORDER BY reply_count DESC
      LIMIT 1
      `,
      [sourceId, botId]
    );

    if (rows.length === 0) return null;

    return {
      userId: rows[0].user_id,
      botId,
      sourceId,
      evidence: { replyCount: rows[0].reply_count },
    };
  }

  /**
   * Combine evidence from multiple strategies
   */
  private combineEvidence(
    candidates: Partial<BotOwnershipCandidate>[]
  ): BotOwnershipCandidate | null {
    if (candidates.length === 0) return null;

    // Count votes for each user
    const votes: Record<string, { count: number; evidence: any }> = {};

    for (const candidate of candidates) {
      if (!candidate.userId) continue;

      if (!votes[candidate.userId]) {
        votes[candidate.userId] = {
          count: 0,
          evidence: {},
        };
      }

      votes[candidate.userId].count++;

      // Merge evidence
      Object.assign(votes[candidate.userId].evidence, candidate.evidence);
    }

    // Find user with most votes
    const winner = Object.entries(votes).sort((a, b) => b[1].count - a[1].count)[0];

    if (!winner) return null;

    const [userId, { count, evidence }] = winner;

    // Calculate confidence: (votes / total_strategies)
    const confidence = count / 3; // We have 3 strategies

    return {
      userId,
      botId: candidates[0].botId!,
      sourceId: candidates[0].sourceId!,
      confidence,
      evidence,
    };
  }

  /**
   * Insert detected ownership into database
   */
  async insertOwnership(candidate: BotOwnershipCandidate): Promise<void> {
    await this.db.query(
      `
      INSERT INTO user_bot_ownership (user_id, bot_id, source_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
      `,
      [candidate.userId, candidate.botId, candidate.sourceId]
    );
  }

  /**
   * Batch insert multiple ownership records
   */
  async batchInsert(candidates: BotOwnershipCandidate[]): Promise<number> {
    let inserted = 0;

    for (const candidate of candidates) {
      try {
        await this.insertOwnership(candidate);
        inserted++;
      } catch (error) {
        console.error(`Failed to insert ownership for bot ${candidate.botId}:`, error);
      }
    }

    return inserted;
  }
}
