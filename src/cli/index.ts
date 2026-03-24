#!/usr/bin/env node
/**
 * OCTO-ONA CLI
 * 
 * Commands:
 *   sync <source_id> [options]  - Sync data from remote to local
 */

import { Command } from 'commander';
import { syncCommand } from './sync';

const program = new Command();

program
  .name('octo-ona')
  .description('Organizational Network Analysis CLI')
  .version('2.0.0');

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

// Parse arguments
program.parse(process.argv);

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
