#!/usr/bin/env node
/**
 * OCTO-ONA Web UI Server
 * 
 * Simple startup script for the Web Configuration UI.
 * Run: npm run start:ui
 */

import { ConfigServer } from './config-server';

async function main() {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const outputDir = process.env.OUTPUT_DIR || './output';
  
  const server = new ConfigServer({ port, outputDir });
  
  await server.start(port);
  
  console.log('\n✅ OCTO-ONA Web UI started successfully!');
  console.log('');
  console.log('📱 Open in your browser:');
  console.log(`   http://localhost:${port}`);
  console.log('');
  console.log('🌍 Language Switcher:');
  console.log('   Click 🇬🇧 EN or 🇨🇳 中文 in the top-right corner');
  console.log('');
  console.log('📚 Supported Platforms:');
  console.log('   - Discord (API)');
  console.log('   - GitHub (GraphQL)');
  console.log('');
  console.log('⏸️  Press Ctrl+C to stop the server');
  console.log('');
}

main().catch((error) => {
  console.error('\n❌ Failed to start server:');
  console.error(error.message);
  console.error('\nPlease check:');
  console.error('1. Port 3000 is not already in use');
  console.error('2. You ran "npm run build" first');
  console.error('3. Static files exist in dist/web-ui/public/');
  process.exit(1);
});
