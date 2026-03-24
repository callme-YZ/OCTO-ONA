/**
 * Seed Metrics Script (TypeScript version)
 * 
 * Usage:
 *   npx ts-node scripts/seed-metrics.ts
 */

import { LocalDatabase } from '../src/database/local-database';
import * as fs from 'fs';
import * as path from 'path';

async function seedMetrics() {
  console.log('🌱 Seeding metrics data...');

  // Load local database config
  const configPath = path.join(process.cwd(), 'octo-ona.config.json');
  let config: any;

  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    config = {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'octo_ona',
    };
  }

  const db = new LocalDatabase(config);

  try {
    // Execute seed SQL
    const sqlPath = path.join(process.cwd(), 'seed-metrics.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📥 Executing seed-metrics.sql...');

    // Split SQL into statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.toLowerCase().startsWith('select')) {
        // Display SELECT results
        const [rows]: any = await (db as any).pool.query(statement);
        console.table(rows);
      } else {
        await (db as any).pool.query(statement);
      }
    }

    console.log('✅ Metrics seeded successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

seedMetrics();
