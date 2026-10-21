import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadConfig } from '../config/config';
import { loadEnv } from '../config/load-env';
import { runMigrations } from './migrate';

loadEnv();
const config = loadConfig();
if (!config.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
try {
  const applied = await runMigrations(pool, fileURLToPath(new URL('../migrations/', import.meta.url)));
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date');
} finally {
  await pool.end();
}
