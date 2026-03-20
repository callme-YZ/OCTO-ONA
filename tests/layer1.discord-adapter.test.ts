/**
 * Discord Adapter Tests (with Nock mocking)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import nock from 'nock';
import { DiscordAdapter } from '../src/layer1/adapters/discord-adapter';

describe('DiscordAdapter', () => {
  beforeEach(() => {
    nock.cleanAll();
  });
  
  afterEach(() => {
    nock.cleanAll();
  });
  
  describe('connect', () => {
    it('should verify bot token successfully', async () => {
      // Mock Discord API - Get Current User
      nock('https://discord.com')
        .get('/api/v10/users/@me')
        .reply(200, {
          id: '123456789',
          username: 'TestBot',
          discriminator: '0001',
          bot: true,
        });
      
      const adapter = new DiscordAdapter();
      
      await expect(
        adapter.connect({ token: 'test-token', guildId: 'test-guild' })
      ).resolves.not.toThrow();
    });
    
    it('should throw error on invalid token', async () => {
      // Mock Discord API - Unauthorized
      nock('https://discord.com')
        .get('/api/v10/users/@me')
        .reply(401, { message: 'Unauthorized' });
      
      const adapter = new DiscordAdapter();
      
      await expect(
        adapter.connect({ token: 'invalid-token', guildId: 'test-guild' })
      ).rejects.toThrow();
    });
  });
  
  describe('extractNetwork', () => {
    it('should extract network from Discord channels', async () => {
      const adapter = new DiscordAdapter();
      
      // Mock: Verify token
      nock('https://discord.com')
        .get('/api/v10/users/@me')
        .reply(200, { id: '123', username: 'Bot', bot: true });
      
      await adapter.connect({ token: 'test-token', guildId: 'guild-1' });
      
      // Mock: List channels
      nock('https://discord.com')
        .get('/api/v10/guilds/guild-1/channels')
        .reply(200, [
          { id: 'channel-1', name: 'general', type: 0 },
          { id: 'channel-2', name: 'dev', type: 0 },
        ]);
      
      // Mock: Fetch messages for channel-1 (first page)
      nock('https://discord.com')
        .get('/api/v10/channels/channel-1/messages')
        .query(true)
        .reply(200, [
          {
            id: 'm1',
            content: 'Hello <@user2>',
            author: { id: 'user1', username: 'Alice', bot: false },
            timestamp: '2026-01-01T00:00:00Z',
            mentions: [{ id: 'user2', username: 'Bob', bot: false }],
          },
          {
            id: 'm2',
            content: 'Hi Alice',
            author: { id: 'user2', username: 'Bob', bot: false },
            timestamp: '2026-01-01T00:01:00Z',
            mentions: [],
            referenced_message: {
              id: 'm1',
              author: { id: 'user1', username: 'Alice', bot: false },
            },
          },
        ]);
      
      // Mock: Fetch messages for channel-1 (second page, empty)
      nock('https://discord.com')
        .get('/api/v10/channels/channel-1/messages')
        .query(true)
        .reply(200, []);
      
      // Mock: Fetch messages for channel-2 (empty)
      nock('https://discord.com')
        .get('/api/v10/channels/channel-2/messages')
        .query(true)
        .reply(200, []);
      
      const graph = await adapter.extractNetwork({
        channelIds: ['channel-1', 'channel-2'],
        startTime: new Date('2026-01-01'),
        endTime: new Date('2026-01-02'),
      });
      
      await adapter.disconnect();
      
      expect(graph.graph_id).toBeDefined();
      expect(graph.human_nodes.length).toBeGreaterThanOrEqual(2);
      expect(graph.edges.length).toBeGreaterThanOrEqual(1);
      expect(graph.summary.total_messages).toBeGreaterThanOrEqual(2);
    });
    
    it('should handle empty channels', async () => {
      const adapter = new DiscordAdapter();
      
      nock('https://discord.com')
        .get('/api/v10/users/@me')
        .reply(200, { id: '123', username: 'Bot', bot: true });
      
      await adapter.connect({ token: 'test-token', guildId: 'guild-1' });
      
      nock('https://discord.com')
        .get('/api/v10/guilds/guild-1/channels')
        .reply(200, []);
      
      const graph = await adapter.extractNetwork({
        startTime: new Date('2026-01-01'),
        endTime: new Date('2026-01-02'),
      });
      
      await adapter.disconnect();
      
      expect(graph.summary.total_nodes).toBe(0);
      expect(graph.summary.total_messages).toBe(0);
    });
  });
  
  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      const adapter = new DiscordAdapter();
      
      nock('https://discord.com')
        .get('/api/v10/users/@me')
        .reply(200, { id: '123', username: 'Bot', bot: true });
      
      await adapter.connect({ token: 'test-token', guildId: 'guild-1' });
      
      await expect(adapter.disconnect()).resolves.not.toThrow();
    });
  });
});
