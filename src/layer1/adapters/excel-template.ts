/**
 * Excel Template Generator
 * 
 * Generates Excel template for manual data input.
 * Users can download, fill, and upload to analyze their network.
 */

import ExcelJS from 'exceljs';

export class ExcelTemplateGenerator {
  /**
   * Generate Excel template with 3 sheets
   */
  async generate(outputPath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Users
    this.createUsersSheet(workbook);
    
    // Sheet 2: Messages
    this.createMessagesSheet(workbook);
    
    // Sheet 3: Instructions
    this.createInstructionsSheet(workbook);
    
    // Save workbook
    await workbook.xlsx.writeFile(outputPath);
  }
  
  private createUsersSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Users');
    
    // Header row
    sheet.columns = [
      { header: 'uid', key: 'uid', width: 30 },
      { header: 'name', key: 'name', width: 20 },
      { header: 'type', key: 'type', width: 15 },
      { header: 'team', key: 'team', width: 20 },
      { header: 'role', key: 'role', width: 20 },
      { header: 'email', key: 'email', width: 30 },
    ];
    
    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Example data
    sheet.addRow({
      uid: 'user_001',
      name: 'Alice',
      type: 'human',
      team: 'Engineering',
      role: 'Developer',
      email: 'alice@example.com',
    });
    
    sheet.addRow({
      uid: 'user_002',
      name: 'Bob',
      type: 'human',
      team: 'Product',
      role: 'PM',
      email: 'bob@example.com',
    });
    
    sheet.addRow({
      uid: 'bot_001',
      name: 'ChatBot',
      type: 'ai_agent',
      team: '',
      role: '',
      email: '',
    });
    
    // Add note
    sheet.getCell('A5').value = 'Note: uid, name, type are required. team, role, email are optional.';
    sheet.getCell('A5').font = { italic: true, color: { argb: 'FF808080' } };
    sheet.mergeCells('A5:F5');
    
    sheet.getCell('A6').value = 'type must be either "human" or "ai_agent"';
    sheet.getCell('A6').font = { italic: true, color: { argb: 'FF808080' } };
    sheet.mergeCells('A6:F6');
  }
  
  private createMessagesSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Messages');
    
    // Header row
    sheet.columns = [
      { header: 'message_id', key: 'message_id', width: 30 },
      { header: 'from_uid', key: 'from_uid', width: 30 },
      { header: 'to_uids', key: 'to_uids', width: 40 },
      { header: 'timestamp', key: 'timestamp', width: 20 },
      { header: 'content', key: 'content', width: 50 },
      { header: 'channel_id', key: 'channel_id', width: 30 },
    ];
    
    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Example data
    sheet.addRow({
      message_id: 'msg_001',
      from_uid: 'user_001',
      to_uids: 'user_002',
      timestamp: '2026-03-01 10:00:00',
      content: 'Hello Bob!',
      channel_id: 'general',
    });
    
    sheet.addRow({
      message_id: 'msg_002',
      from_uid: 'user_002',
      to_uids: 'user_001,bot_001',
      timestamp: '2026-03-01 10:05:00',
      content: 'Hi Alice! @ChatBot can you help?',
      channel_id: 'general',
    });
    
    sheet.addRow({
      message_id: 'msg_003',
      from_uid: 'bot_001',
      to_uids: 'user_002',
      timestamp: '2026-03-01 10:06:00',
      content: 'Sure! How can I help you?',
      channel_id: 'general',
    });
    
    // Add note
    sheet.getCell('A6').value = 'Note: message_id, from_uid, to_uids, timestamp are required. content, channel_id are optional.';
    sheet.getCell('A6').font = { italic: true, color: { argb: 'FF808080' } };
    sheet.mergeCells('A6:F6');
    
    sheet.getCell('A7').value = 'to_uids: Use comma to separate multiple recipients (e.g., "user1,user2,user3")';
    sheet.getCell('A7').font = { italic: true, color: { argb: 'FF808080' } };
    sheet.mergeCells('A7:F7');
    
    sheet.getCell('A8').value = 'timestamp format: YYYY-MM-DD HH:MM:SS or ISO 8601';
    sheet.getCell('A8').font = { italic: true, color: { argb: 'FF808080' } };
    sheet.mergeCells('A8:F8');
  }
  
  private createInstructionsSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Instructions');
    
    sheet.columns = [
      { key: 'content', width: 100 },
    ];
    
    const instructions = [
      { title: 'OCTO-ONA Excel Template - User Guide', style: 'title' },
      { title: '', style: 'empty' },
      { title: '📋 How to Use This Template', style: 'heading' },
      { title: '', style: 'empty' },
      { title: '1. Fill in the "Users" sheet with your team members and bots', style: 'text' },
      { title: '   - uid: Unique identifier for each user (required)', style: 'text' },
      { title: '   - name: Display name (required)', style: 'text' },
      { title: '   - type: Either "human" or "ai_agent" (required)', style: 'text' },
      { title: '   - team, role, email: Optional fields', style: 'text' },
      { title: '', style: 'empty' },
      { title: '2. Fill in the "Messages" sheet with your communication records', style: 'text' },
      { title: '   - message_id: Unique identifier for each message (required)', style: 'text' },
      { title: '   - from_uid: Sender UID (must exist in Users sheet, required)', style: 'text' },
      { title: '   - to_uids: Recipient UIDs, comma-separated (required)', style: 'text' },
      { title: '   - timestamp: Message time in YYYY-MM-DD HH:MM:SS format (required)', style: 'text' },
      { title: '   - content: Message text (optional, for connoisseurship analysis)', style: 'text' },
      { title: '   - channel_id: Channel/group identifier (optional)', style: 'text' },
      { title: '', style: 'empty' },
      { title: '3. Save the file and upload to OCTO-ONA Web UI', style: 'text' },
      { title: '', style: 'empty' },
      { title: '⚠️ Important Notes', style: 'heading' },
      { title: '', style: 'empty' },
      { title: '• Do NOT modify sheet names or header rows', style: 'text' },
      { title: '• All UIDs in Messages must exist in Users sheet', style: 'text' },
      { title: '• Timestamp must be in valid date format', style: 'text' },
      { title: '• to_uids supports multiple recipients: "user1,user2,user3"', style: 'text' },
      { title: '• Delete example rows before filling your data', style: 'text' },
      { title: '', style: 'empty' },
      { title: '✨ Example Use Cases', style: 'heading' },
      { title: '', style: 'empty' },
      { title: '• Analyze email communication patterns', style: 'text' },
      { title: '• Track Slack/Teams conversations', style: 'text' },
      { title: '• Study meeting collaboration networks', style: 'text' },
      { title: '• Research human-AI interaction patterns', style: 'text' },
      { title: '', style: 'empty' },
      { title: '📊 What Happens Next?', style: 'heading' },
      { title: '', style: 'empty' },
      { title: 'After uploading, OCTO-ONA will:', style: 'text' },
      { title: '1. Parse your data and build a network graph', style: 'text' },
      { title: '2. Calculate 15+ metrics (hub score, betweenness, etc.)', style: 'text' },
      { title: '3. Generate an interactive Dashboard with visualizations', style: 'text' },
      { title: '4. Provide insights about collaboration patterns', style: 'text' },
      { title: '', style: 'empty' },
      { title: '🔒 Privacy & Security', style: 'heading' },
      { title: '', style: 'empty' },
      { title: '• Your data is processed locally on the server', style: 'text' },
      { title: '• Uploaded files are deleted after analysis', style: 'text' },
      { title: '• No data is stored permanently', style: 'text' },
      { title: '• Follow your organization\'s data handling policies', style: 'text' },
      { title: '', style: 'empty' },
      { title: 'For more information, visit: https://github.com/callme-YZ/OCTO-ONA', style: 'text' },
    ];
    
    instructions.forEach((item, index) => {
      const row = sheet.getRow(index + 1);
      row.getCell(1).value = item.title;
      
      if (item.style === 'title') {
        row.font = { bold: true, size: 16, color: { argb: 'FF4472C4' } };
      } else if (item.style === 'heading') {
        row.font = { bold: true, size: 14, color: { argb: 'FF70AD47' } };
      } else if (item.style === 'text') {
        row.font = { size: 11 };
      }
    });
    
    sheet.getRow(1).height = 30;
  }
}
