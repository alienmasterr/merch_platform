import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Queryable } from './queryable';

export async function runMigrations(db: Queryable, dir: string): Promise<string[]> {
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
  const { rows } = await db.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => String(r.name)));

  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const newlyApplied: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(dir, file), 'utf8');
    const record = `INSERT INTO schema_migrations (name) VALUES ('${file.replace(/'/g, "''")}')`;
    await db.query(`${sql}\n;\n${record};`);
    newlyApplied.push(file);
  }
  return newlyApplied;
}
