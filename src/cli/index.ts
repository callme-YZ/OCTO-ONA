#!/usr/bin/env node
/**
 * OCTO-ONA CLI
 * 
 * Commands:
 *   sync <source_id> [options]  - Sync data from remote to local
 */

import { Command } from 'commander';
import { syncCommand } from './sync';
import { assignBot, listBots, removeBot, showBot, importBots } from './bot';

const program = new Command();

program
  .name('octo-ona')
  .description('Organizational Network Analysis CLI')
  .version('3.0.0');

// Sync command
program
  .command('sync <source_id>')
  .description('Sync data from remote database to local cache')
  .option('--full', 'Perform full sync (default: incremental)')
  .option('--start-time <date>', 'Start time (ISO format, e.g., 2026-03-01)')
  .option('--end-time <date>', 'End time (ISO format, e.g., 2026-03-20)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (sourceId: string, options: any) => {
    try {
      await syncCommand(sourceId, {
        full: options.full,
        startTime: options.startTime,
        endTime: options.endTime,
        verbose: options.verbose,
      });
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Bot management commands
const bot = program.command('bot').description('Manage bot ownership');

bot
  .command('assign <user_id> <bot_id>')
  .description('Assign a bot to a user')
  .option('--source-id <id>', 'Data source ID (auto-detected if not provided)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (userId: string, botId: string, options: any) => {
    try {
      await assignBot(userId, botId, {
        sourceId: options.sourceId,
        verbose: options.verbose,
      });
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

bot
  .command('list <user_id>')
  .description('List bots owned by a user')
  .option('-v, --verbose', 'Verbose output')
  .action(async (userId: string, options: any) => {
    try {
      await listBots(userId, {
        verbose: options.verbose,
      });
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

bot
  .command('remove <user_id> <bot_id>')
  .description('Remove bot ownership')
  .option('-v, --verbose', 'Verbose output')
  .action(async (userId: string, botId: string, options: any) => {
    try {
      await removeBot(userId, botId, {
        verbose: options.verbose,
      });
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

bot
  .command('show <bot_id>')
  .description('Show bot owner')
  .option('-v, --verbose', 'Verbose output')
  .action(async (botId: string, options: any) => {
    try {
      await showBot(botId, {
        verbose: options.verbose,
      });
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

bot
  .command('import <csv_path>')
  .description('Batch import bot ownership from CSV')
  .option('--source-id <id>', 'Default source ID for entries without one')
  .option('-v, --verbose', 'Verbose output')
  .action(async (csvPath: string, options: any) => {
    try {
      await importBots(csvPath, {
        sourceId: options.sourceId,
        verbose: options.verbose,
      });
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
