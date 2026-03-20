/**
 * Discord Adapter v2.0
 * 
 * Extracts network data from Discord servers using Discord API.
 * Uses BaseAdapter v2.0 (minimal interface) + NetworkGraphBuilder utility.
 */

import { BaseAdapter, AdapterConfig } from '../base-adapter-v2';
import { NetworkGraphBuilder } from '../network-graph-builder';
import { NetworkGraph, Message } from '../../layer2/models';

// Discord API types
interface DiscordConfig extends AdapterConfig {
  token: string;           // Bot token or User token
  guildId: string;         // Discord server (guild) ID
}

interface DiscordExtractionOptions {
  startTime: Date;
  endTime: Date;
  channelIds?: string[];   // Specific channels to analyze
  limit?: number;           // Max messages per channel
}

interface DiscordUser {
  id: string;
  username: string;
  bot?: boolean;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

interface DiscordMessage {
  id: string;
  channel_id: string;
  author: DiscordUser;
  content: string;
  timestamp: string;
  mentions: DiscordUser[];
  referenced_message?: DiscordMessage;
}

/**
 * Discord Adapter
 * 
 * @example
 * ```typescript
 * const adapter = new DiscordAdapter();
 * 
 * await adapter.connect({
 *   token: 'YOUR_BOT_TOKEN',
 *   guildId: '1234567890',
 * });
 * 
 * const graph = await adapter.extractNetwork({
 *   startTime: new Date('2026-03-01'),
 *   endTime: new Date('2026-03-20'),
 * });
 * ```
 */
export class DiscordAdapter extends BaseAdapter {
  private token?: string;
  private guildId?: string;
  private baseUrl = 'https://discord.com/api/v10';
  
  async connect(config: DiscordConfig): Promise<void> {
    this.token = config.token;
    this.guildId = config.guildId;
    
    // Verify token
    const response = await fetch(`${this.baseUrl}/users/@me`, {
      headers: { Authorization: `Bot ${this.token}` },
    });
    
    if (!response.ok) {
      throw new Error(`Discord auth failed: ${response.status}`);
    }
    
    console.log(`Connected to Discord guild: ${this.guildId}`);
  }
  
  async extractNetwork(options: DiscordExtractionOptions): Promise<NetworkGraph> {
    if (!this.token || !this.guildId) {
      throw new Error('Not connected. Call connect() first.');
    }
    
    console.log('Fetching Discord data...');
    
    // 1. Fetch channels
    const channels = await this.fetchChannels(options.channelIds);
    
    // 2. Fetch messages
    const discordMessages = await this.fetchMessages(channels, options);
    
    // 3. Extract users from messages
    const rawUsers = this.extractUsers(discordMessages);
    const { humans, bots } = NetworkGraphBuilder.separateUsers(rawUsers);
    
    // 4. Build edges using NetworkGraphBuilder
    const humanIds = new Set(humans.map(h => h.id));
    const botIds = new Set(bots.map(b => b.id));
    
    const simplifiedMessages = discordMessages.map(msg => ({
      id: msg.id,
      from: msg.author.id,
      to: [
        ...msg.mentions.map(m => m.id),
        ...(msg.referenced_message ? [msg.referenced_message.author.id] : []),
      ],
      timestamp: new Date(msg.timestamp),
    }));
    
    const edges = NetworkGraphBuilder.buildEdges(simplifiedMessages, humanIds, botIds);
    
    // 5. Transform to Message objects
    const messages = this.transformMessages(discordMessages);
    
    // 6. Build NetworkGraph using NetworkGraphBuilder
    return NetworkGraphBuilder.build({
      graphId: `discord_${this.guildId}_${Date.now()}`,
      description: `Discord network from guild ${this.guildId}`,
      startTime: options.startTime,
      endTime: options.endTime,
      humans,
      bots,
      edges,
      messages,
    });
  }
  
  async disconnect(): Promise<void> {
    this.token = undefined;
    this.guildId = undefined;
    console.log('Disconnected from Discord');
  }
  
  // ============================================
  // Private Methods
  // ============================================
  
  private async fetchChannels(channelIds?: string[]): Promise<DiscordChannel[]> {
    const response = await fetch(`${this.baseUrl}/guilds/${this.guildId}/channels`, {
      headers: { Authorization: `Bot ${this.token}` },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch channels: ${response.status}`);
    }
    
    const allChannels = await response.json() as DiscordChannel[];
    let channels = allChannels.filter(ch => ch.type === 0); // Text channels only
    
    if (channelIds && channelIds.length > 0) {
      channels = channels.filter(ch => channelIds.includes(ch.id));
    }
    
    return channels;
  }
  
  private async fetchMessages(
    channels: DiscordChannel[],
    options: DiscordExtractionOptions
  ): Promise<DiscordMessage[]> {
    const allMessages: DiscordMessage[] = [];
    
    for (const channel of channels) {
      let beforeId: string | undefined;
      let fetchedCount = 0;
      const limit = options.limit ?? 1000;
      
      while (fetchedCount < limit) {
        const url = new URL(`${this.baseUrl}/channels/${channel.id}/messages`);
        url.searchParams.set('limit', '100');
        if (beforeId) url.searchParams.set('before', beforeId);
        
        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bot ${this.token}` },
        });
        
        if (!response.ok) break;
        
        const messages = await response.json() as DiscordMessage[];
        if (messages.length === 0) break;
        
        const filtered = messages.filter(msg => {
          const msgTime = new Date(msg.timestamp);
          return msgTime >= options.startTime && msgTime <= options.endTime;
        });
        
        allMessages.push(...filtered);
        fetchedCount += messages.length;
        beforeId = messages[messages.length - 1].id;
        
        await new Promise(resolve => setTimeout(resolve, 20)); // Rate limit
      }
    }
    
    return allMessages;
  }
  
  private extractUsers(messages: DiscordMessage[]): Array<{
    id: string;
    name: string;
    is_bot: boolean;
  }> {
    const userMap = new Map<string, { id: string; name: string; is_bot: boolean }>();
    
    for (const msg of messages) {
      userMap.set(msg.author.id, {
        id: msg.author.id,
        name: msg.author.username,
        is_bot: msg.author.bot ?? false,
      });
      
      for (const mention of msg.mentions) {
        userMap.set(mention.id, {
          id: mention.id,
          name: mention.username,
          is_bot: mention.bot ?? false,
        });
      }
    }
    
    return Array.from(userMap.values());
  }
  
  private transformMessages(discordMessages: DiscordMessage[]): Message[] {
    return discordMessages.map(msg => ({
      id: msg.id,
      from_uid: msg.author.id,
      to_uids: [
        ...msg.mentions.map(m => m.id),
        ...(msg.referenced_message ? [msg.referenced_message.author.id] : []),
      ],
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      platform: 'discord',
      context_id: msg.channel_id,
    }));
  }
}
