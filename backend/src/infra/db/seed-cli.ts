import pg from 'pg';
import { PostgresCatalogRepository } from '../../modules/catalog/infrastructure/postgres-catalog-repository';
import { seedCatalog } from '../../modules/catalog/infrastructure/dev-seed';
import { loadConfig } from '../config/config';
import { loadEnv } from '../config/load-env';

loadEnv();
const config = loadConfig();
if (!config.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
try {
  await seedCatalog(new PostgresCatalogRepository(pool));
  console.log('Catalog seeded');
} finally {
  await pool.end();
}
