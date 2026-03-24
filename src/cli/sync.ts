/**
 * CLI: Sync Command
 * 
 * Usage:
 *   octo-ona sync <source_id> [options]
 */

import { OCTOAdapter } from '../layer1/adapters/octo-adapter';
import { LocalDatabaseConfig } from '../database/local-database';
import * as fs from 'fs';
import * as path from 'path';

export interface SyncOptions {
  full?: boolean; // Full sync (default: incremental)
  startTime?: string; // ISO date string
  endTime?: string; // ISO date string
  verbose?: boolean;
}

export async function syncCommand(sourceId: string, options: SyncOptions = {}): Promise<void> {
  console.log(`🚀 Starting sync for source: ${sourceId}`);
  console.log(`📋 Mode: ${options.full ? 'Full' : 'Incremental'}`);

  // Step 1: Load configuration
  const remoteConfig = loadRemoteConfig(sourceId);
  const localConfig = loadLocalConfig();

  if (!remoteConfig) {
    throw new Error(`Remote config not found for source: ${sourceId}`);
  }

  // Step 2: Determine time range
  let startTime: Date | undefined;
  let endTime: Date | undefined;

  if (options.startTime) {
    startTime = new Date(options.startTime);
  } else if (!options.full) {
    // Incremental: get last sync time
    const { LocalDatabase } = await import('../database/local-database');
    const db = new LocalDatabase(localConfig);
    const lastSync = await db.getLastSync(sourceId);
    await db.close();

    if (lastSync) {
      startTime = new Date(lastSync.last_sync_at);
      console.log(`📅 Incremental sync from: ${startTime.toISOString()}`);
    } else {
      console.log(`📅 No previous sync found, performing full sync`);
    }
  }

  if (options.endTime) {
    endTime = new Date(options.endTime);
  } else {
    endTime = new Date(); // Now
  }

  if (options.verbose) {
    console.log(`📅 Time range: ${startTime?.toISOString() || 'beginning'} → ${endTime.toISOString()}`);
  }

  // Step 3: Create adapter and sync
  const adapter = new OCTOAdapter({
    mode: 'sync',
    remoteConfig,
    localConfig,
    sourceId,
  });

  try {
    console.log('🔌 Connecting to databases...');
    await adapter.connect();

    console.log('🔄 Syncing data...');
    await adapter.syncToLocal({
      startTime,
      endTime,
    });

    console.log('✅ Sync complete!');
  } catch (error) {
    console.error('❌ Sync failed:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await adapter.disconnect();
  }
}

/**
 * Load remote database config
 */
function loadRemoteConfig(sourceId: string): any | null {
  // Try to load from octo-remote.config.json (or source-specific file)
  const configPath = path.join(process.cwd(), `${sourceId}.config.json`);
  const fallbackPath = path.join(process.cwd(), 'octo-remote.config.json');

  for (const p of [configPath, fallbackPath]) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      return JSON.parse(content);
    }
  }

  // Fallback: check environment variables
  if (process.env.OCTO_REMOTE_HOST) {
    return {
      host: process.env.OCTO_REMOTE_HOST,
      port: parseInt(process.env.OCTO_REMOTE_PORT || '3306'),
      user: process.env.OCTO_REMOTE_USER || 'root',
      password: process.env.OCTO_REMOTE_PASSWORD || '',
      database: process.env.OCTO_REMOTE_DATABASE || 'im',
    };
  }

  return null;
}

/**
 * Load local database config
 */
function loadLocalConfig(): LocalDatabaseConfig {
  const configPath = path.join(process.cwd(), 'octo-ona.config.json');

  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  }

  // Fallback: environment variables or defaults
  return {
    host: process.env.OCTO_LOCAL_HOST || 'localhost',
    port: parseInt(process.env.OCTO_LOCAL_PORT || '3306'),
    user: process.env.OCTO_LOCAL_USER || 'root',
    password: process.env.OCTO_LOCAL_PASSWORD || '',
    database: process.env.OCTO_LOCAL_DATABASE || 'octo_ona',
  };
}
