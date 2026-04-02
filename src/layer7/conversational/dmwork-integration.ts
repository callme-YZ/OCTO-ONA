/**
 * Layer 7: Conversational ONA - DMWork Integration
 * 
 * DMWork 消息发送和附件上传
 */

import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs/promises';

/**
 * DMWork 配置
 */
export interface DMWorkConfig {
  botToken: string;
  apiUrl?: string;
}

/**
 * 发送消息选项
 */
export interface SendMessageOptions {
  channelId: string;
  channelType: 1 | 2; // 1=DM, 2=Group
  message: string;
  attachmentPath?: string; // 可选附件路径
}

/**
 * DMWork 集成
 */
export class DMWorkIntegration {
  private client: AxiosInstance;
  private botToken: string;

  constructor(config: DMWorkConfig) {
    this.botToken = config.botToken;
    const apiUrl = config.apiUrl || 'https://im.deepminer.com.cn/api';

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * 发送消息（带可选附件）
   */
  async sendMessage(options: SendMessageOptions): Promise<void> {
    try {
      // 1. 如果有附件，先上传
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;

      if (options.attachmentPath) {
        console.log(`[DMWork] Uploading attachment: ${options.attachmentPath}`);
        const uploadResult = await this.uploadFile(options.attachmentPath);
        fileUrl = uploadResult.url;
        fileName = uploadResult.name;
        fileSize = uploadResult.size;
        console.log(`[DMWork] Attachment uploaded: ${fileUrl}`);
      }

      // 2. 发送文本消息
      console.log(`[DMWork] Sending text message to ${options.channelId}`);
      await this.sendTextMessage(
        options.channelId,
        options.channelType,
        options.message
      );

      // 3. 如果有附件，再发送附件消息
      if (fileUrl && fileName && fileSize) {
        console.log(`[DMWork] Sending file message`);
        await this.sendFileMessage(
          options.channelId,
          options.channelType,
          fileUrl,
          fileName,
          fileSize
        );
      }

      console.log(`[DMWork] Message sent successfully`);
    } catch (error: any) {
      console.error('[DMWork] Failed to send message:', error.message);
      throw new Error(`DMWork send failed: ${error.message}`);
    }
  }

  /**
   * 发送文本消息
   */
  private async sendTextMessage(
    channelId: string,
    channelType: 1 | 2,
    content: string
  ): Promise<void> {
    await this.client.post('/v1/bot/sendMessage', {
      channel_id: channelId,
      channel_type: channelType,
      payload: {
        type: 1, // Text
        content
      }
    });
  }

  /**
   * 发送文件消息
   */
  private async sendFileMessage(
    channelId: string,
    channelType: 1 | 2,
    fileUrl: string,
    fileName: string,
    fileSize: number
  ): Promise<void> {
    // 判断文件类型
    const ext = fileName.toLowerCase().split('.').pop();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const isImage = imageExts.includes(ext || '');

    const payload: any = {
      url: fileUrl,
      name: fileName,
      size: fileSize
    };

    const messageType = isImage ? 2 : 8; // 2=Image, 8=File

    await this.client.post('/v1/bot/sendMessage', {
      channel_id: channelId,
      channel_type: channelType,
      payload: {
        type: messageType,
        ...payload
      }
    });
  }

  /**
   * 上传文件
   */
  private async uploadFile(filePath: string): Promise<{
    url: string;
    name: string;
    size: number;
  }> {
    const formData = new FormData();
    const fileBuffer = await fs.readFile(filePath);
    const fileName = filePath.split('/').pop() || 'file';

    formData.append('file', fileBuffer, fileName);

    const response = await this.client.post('/v1/bot/file/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${this.botToken}`
      },
      maxContentLength: 100 * 1024 * 1024, // 100MB
      maxBodyLength: 100 * 1024 * 1024
    });

    return response.data;
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 发送心跳测试连接
      await this.client.post('/v1/bot/heartbeat');
      return true;
    } catch (error) {
      return false;
    }
  }
}
