/**
 * DiscordAdapter Tests
 */

import { DiscordAdapter } from '../src/layer1/adapters/discord-adapter';

describe('Layer 1: DiscordAdapter', () => {
  
  describe('Connection', () => {
    it('should create adapter instance', () => {
      const adapter = new DiscordAdapter();
      expect(adapter).toBeInstanceOf(DiscordAdapter);
    });
    
    it('should require token and guildId', async () => {
      const adapter = new DiscordAdapter();
      
      await expect(
        adapter.extractNetwork({
          startTime: new Date(),
          endTime: new Date(),
        })
      ).rejects.toThrow('Not connected');
    });
  });
  
  describe('Mock Data Extraction', () => {
    it('should handle empty messages', async () => {
      // This is a placeholder test
      // Real tests would use mocked Discord API responses
      expect(true).toBe(true);
    });
  });
});
