/**
 * Excel Adapter
 * 
 * Parse Excel file (template format) and extract network data.
 * Supports manual data input workflow.
 */

import ExcelJS from 'exceljs';
import { NetworkGraph, Message } from '../../layer2/models';
import { NetworkGraphBuilder } from '../network-graph-builder';

export interface ExcelAdapterConfig {
  filePath: string;
}

interface ExcelUser {
  uid: string;
  name: string;
  type: 'human' | 'ai_agent';
  team?: string;
  role?: string;
  email?: string;
}

interface ExcelMessage {
  message_id: string;
  from_uid: string;
  to_uids: string;
  timestamp: string;
  content?: string;
  channel_id?: string;
}

export class ExcelAdapter {
  private filePath?: string;
  
  /**
   * Connect (validate file exists)
   */
  async connect(config: ExcelAdapterConfig): Promise<void> {
    this.filePath = config.filePath;
    
    // Basic validation will happen in extractNetwork
  }
  
  /**
   * Extract network from Excel file
   */
  async extractNetwork(): Promise<NetworkGraph> {
    if (!this.filePath) {
      throw new Error('Not connected. Call connect() first.');
    }
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.filePath);
    
    // Parse users
    const users = this.parseUsers(workbook);
    
    // Parse messages
    const messages = this.parseMessages(workbook);
    
    // Validate UIDs
    this.validateUIDs(users, messages);
    
    // Build network graph
    return this.buildGraph(users, messages);
  }
  
  /**
   * Disconnect (cleanup)
   */
  async disconnect(): Promise<void> {
    this.filePath = undefined;
  }
  
  // ============================================
  // Private Helper Methods
  // ============================================
  
  private parseUsers(workbook: ExcelJS.Workbook): ExcelUser[] {
    const sheet = workbook.getWorksheet('Users');
    if (!sheet) {
      throw new Error('Missing "Users" sheet in Excel file');
    }
    
    const users: ExcelUser[] = [];
    const rows = sheet.getRows(2, sheet.rowCount - 1) || []; // Skip header
    
    for (const row of rows) {
      const uid = this.getCellValue(row, 1);
      const name = this.getCellValue(row, 2);
      const type = this.getCellValue(row, 3);
      
      // Skip empty rows
      if (!uid || !name || !type) {
        continue;
      }
      
      // Validate type
      if (type !== 'human' && type !== 'ai_agent') {
        throw new Error(`Invalid type "${type}" for user ${uid}. Must be "human" or "ai_agent".`);
      }
      
      users.push({
        uid,
        name,
        type: type as 'human' | 'ai_agent',
        team: this.getCellValue(row, 4) || undefined,
        role: this.getCellValue(row, 5) || undefined,
        email: this.getCellValue(row, 6) || undefined,
      });
    }
    
    if (users.length === 0) {
      throw new Error('No users found in "Users" sheet');
    }
    
    return users;
  }
  
  private parseMessages(workbook: ExcelJS.Workbook): ExcelMessage[] {
    const sheet = workbook.getWorksheet('Messages');
    if (!sheet) {
      throw new Error('Missing "Messages" sheet in Excel file');
    }
    
    const messages: ExcelMessage[] = [];
    const rows = sheet.getRows(2, sheet.rowCount - 1) || []; // Skip header
    
    for (const row of rows) {
      const message_id = this.getCellValue(row, 1);
      const from_uid = this.getCellValue(row, 2);
      const to_uids = this.getCellValue(row, 3);
      const timestamp = this.getCellValue(row, 4);
      
      // Skip empty rows
      if (!message_id || !from_uid || !to_uids || !timestamp) {
        continue;
      }
      
      messages.push({
        message_id,
        from_uid,
        to_uids,
        timestamp,
        content: this.getCellValue(row, 5) || '',
        channel_id: this.getCellValue(row, 6) || undefined,
      });
    }
    
    if (messages.length === 0) {
      throw new Error('No messages found in "Messages" sheet');
    }
    
    return messages;
  }
  
  private getCellValue(row: ExcelJS.Row, col: number): string {
    const cell = row.getCell(col);
    const value = cell.value;
    
    if (value === null || value === undefined) {
      return '';
    }
    
    // Handle date values
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    // Handle rich text
    if (typeof value === 'object' && 'richText' in value) {
      return (value as any).richText.map((t: any) => t.text).join('');
    }
    
    return String(value).trim();
  }
  
  private validateUIDs(users: ExcelUser[], messages: ExcelMessage[]): void {
    const userIds = new Set(users.map(u => u.uid));
    
    for (const msg of messages) {
      // Validate from_uid
      if (!userIds.has(msg.from_uid)) {
        throw new Error(`Message ${msg.message_id}: from_uid "${msg.from_uid}" not found in Users sheet`);
      }
      
      // Validate to_uids
      const toUids = msg.to_uids.split(',').map(uid => uid.trim());
      for (const uid of toUids) {
        if (!userIds.has(uid)) {
          throw new Error(`Message ${msg.message_id}: to_uid "${uid}" not found in Users sheet`);
        }
      }
    }
  }
  
  private buildGraph(users: ExcelUser[], excelMessages: ExcelMessage[]): NetworkGraph {
    // Separate humans and bots
    const usersForBuilder = users.map(u => ({
      id: u.uid,
      name: u.name,
      is_bot: u.type === 'ai_agent',
      team: u.team,
      role: u.role,
      email: u.email,
    }));
    
    const { humans, bots } = NetworkGraphBuilder.separateUsers(usersForBuilder);
    
    // Convert messages
    const messages: Message[] = excelMessages.map(m => ({
      id: m.message_id,
      from_uid: m.from_uid,
      to_uids: m.to_uids.split(',').map(uid => uid.trim()),
      content: m.content || '',
      timestamp: this.parseTimestamp(m.timestamp),
      platform: 'excel',
      context_id: m.channel_id,
    }));
    
    // Build edges
    const humanIds = new Set(humans.map(h => h.id));
    const botIds = new Set(bots.map(b => b.id));
    
    const msgForEdges = messages.map(m => ({
      id: m.id,
      from: m.from_uid,
      to: m.to_uids,
      timestamp: m.timestamp,
    }));
    
    const edges = NetworkGraphBuilder.buildEdges(msgForEdges, humanIds, botIds);
    
    // Calculate time range
    const timestamps = messages.map(m => m.timestamp.getTime());
    const startTime = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date();
    const endTime = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();
    
    // Build graph
    return NetworkGraphBuilder.build({
      graphId: `excel_${Date.now()}`,
      description: 'Network imported from Excel template',
      startTime,
      endTime,
      humans,
      bots,
      edges,
      messages,
    });
  }
  
  private parseTimestamp(value: string): Date {
    // Try parsing as ISO 8601
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp format: "${value}". Use YYYY-MM-DD HH:MM:SS or ISO 8601.`);
    }
    
    return date;
  }
}
