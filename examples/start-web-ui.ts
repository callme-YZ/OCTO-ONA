/**
 * Start Web Configuration UI
 * 
 * Usage: npm run dev examples/start-web-ui.ts
 */

import { ConfigServer } from '../src/web-ui/config-server';

async function main() {
  const server = new ConfigServer({
    port: 3000,
    outputDir: './output'
  });
  
  await server.start(3000);
  
  console.log('\n✅ Web UI started!');
  console.log('📱 Open in browser: http://localhost:3000');
  console.log('🌍 Language switcher: Top-right corner (🇬🇧 EN / 🇨🇳 中文)');
  console.log('\n⏸️  Press Ctrl+C to stop\n');
}

main().catch(console.error);
