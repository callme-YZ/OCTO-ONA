/**
 * Layer 7: Conversational ONA - DMWork Integration Tests
 */

import { DMWorkIntegration } from '../../../src/layer7/conversational/dmwork-integration';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn()
}));
import * as fs from 'fs/promises';

describe('DMWorkIntegration', () => {
  let integration: DMWorkIntegration;
  let mockPost: jest.Mock;

  beforeEach(() => {
    // Setup axios mock
    mockPost = jest.fn();
    const mockAxiosInstance: any = {
      post: mockPost,
      defaults: { baseURL: 'https://example.com/api' }
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    integration = new DMWorkIntegration({
      botToken: 'test_token',
      apiUrl: 'https://example.com/api'
    });

    // Reset fs mock
    jest.mocked(fs.readFile).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // 测试：发送文本消息
  // ============================================================================
  describe('Send text message', () => {
    test('Case 1: Send simple text message (DM)', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });

      await integration.sendMessage({
        channelId: 'user123',
        channelType: 1,
        message: 'Hello!'
      });

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith('/v1/bot/sendMessage', {
        channel_id: 'user123',
        channel_type: 1,
        payload: {
          type: 1,
          content: 'Hello!'
        }
      });
    });

    test('Case 2: Send text message to group', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });

      await integration.sendMessage({
        channelId: 'group456',
        channelType: 2,
        message: 'Hello group!'
      });

      expect(mockPost).toHaveBeenCalledWith('/v1/bot/sendMessage', {
        channel_id: 'group456',
        channel_type: 2,
        payload: {
          type: 1,
          content: 'Hello group!'
        }
      });
    });
  });

  // ============================================================================
  // 测试：发送带附件的消息
  // ============================================================================
  describe('Send message with attachment', () => {
    test('Case 3: Send message with file attachment', async () => {
      // Mock file read
      jest.mocked(fs.readFile).mockResolvedValue(Buffer.from('file content'));

      // Mock upload response
      mockPost
        .mockResolvedValueOnce({
          data: {
            url: 'https://example.com/files/report.pdf',
            name: 'report.pdf',
            size: 1234
          }
        })
        // Mock text message send
        .mockResolvedValueOnce({ data: {} })
        // Mock file message send
        .mockResolvedValueOnce({ data: {} });

      await integration.sendMessage({
        channelId: 'user123',
        channelType: 1,
        message: 'Here is your report',
        attachmentPath: '/tmp/report.pdf'
      });

      // Should call: upload, text message, file message
      expect(mockPost).toHaveBeenCalledTimes(3);

      // Check file message payload
      expect(mockPost).toHaveBeenCalledWith('/v1/bot/sendMessage', {
        channel_id: 'user123',
        channel_type: 1,
        payload: {
          type: 8, // File type
          url: 'https://example.com/files/report.pdf',
          name: 'report.pdf',
          size: 1234
        }
      });
    });

    test('Case 4: Send message with image attachment', async () => {
      jest.mocked(fs.readFile).mockResolvedValue(Buffer.from('image data'));

      mockPost
        .mockResolvedValueOnce({
          data: {
            url: 'https://example.com/files/photo.jpg',
            name: 'photo.jpg',
            size: 5678
          }
        })
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({ data: {} });

      await integration.sendMessage({
        channelId: 'user123',
        channelType: 1,
        message: 'Check this out',
        attachmentPath: '/tmp/photo.jpg'
      });

      // Should send as image (type=2)
      expect(mockPost).toHaveBeenCalledWith('/v1/bot/sendMessage', {
        channel_id: 'user123',
        channel_type: 1,
        payload: {
          type: 2, // Image type
          url: 'https://example.com/files/photo.jpg',
          name: 'photo.jpg',
          size: 5678
        }
      });
    });
  });

  // ============================================================================
  // 测试：错误处理
  // ============================================================================
  describe('Error handling', () => {
    test('Case 5: Handle API error gracefully', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      await expect(integration.sendMessage({
        channelId: 'user123',
        channelType: 1,
        message: 'Test'
      })).rejects.toThrow('DMWork send failed: Network error');
    });

    test('Case 6: Handle file upload error', async () => {
      jest.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      await expect(integration.sendMessage({
        channelId: 'user123',
        channelType: 1,
        message: 'Test',
        attachmentPath: '/nonexistent/file.pdf'
      })).rejects.toThrow('DMWork send failed');
    });
  });

  // ============================================================================
  // 测试：连接测试
  // ============================================================================
  describe('Connection test', () => {
    test('Case 7: Test connection success', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });

      const result = await integration.testConnection();

      expect(result).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/v1/bot/heartbeat');
    });

    test('Case 8: Test connection failure', async () => {
      mockPost.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await integration.testConnection();

      expect(result).toBe(false);
    });
  });
});
