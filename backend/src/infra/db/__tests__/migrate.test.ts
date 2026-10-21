import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runMigrations } from '../migrate';
import type { Queryable, QueryResult } from '../queryable';

class FakeDb implements Queryable {
  queries: string[] = [];
  appliedNames: string[] = [];
  async query(text: string): Promise<QueryResult> {
    this.queries.push(text);
    if (text.startsWith('SELECT name')) return { rows: this.appliedNames.map((name) => ({ name })) };
    return { rows: [] };
  }
}

describe('runMigrations', () => {
  let dir = '';
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function prepare(files: Record<string, string>) {
    dir = await mkdtemp(join(tmpdir(), 'mig-'));
    for (const [name, sql] of Object.entries(files)) await writeFile(join(dir, name), sql);
  }

  it('застосовує файли за алфавітом і записує їх у schema_migrations', async () => {
    await prepare({ '002_b.sql': 'CREATE TABLE b();', '001_a.sql': 'CREATE TABLE a();', 'notes.txt': 'ignore' });
    const db = new FakeDb();
    expect(await runMigrations(db, dir)).toEqual(['001_a.sql', '002_b.sql']);
    const migrationQueries = db.queries.filter((q) => q.includes('schema_migrations (name)'));
    expect(migrationQueries[0]).toContain('CREATE TABLE a();');
    expect(migrationQueries[0]).toContain("VALUES ('001_a.sql')");
  });

  it('пропускає вже застосовані', async () => {
    await prepare({ '001_a.sql': 'CREATE TABLE a();', '002_b.sql': 'CREATE TABLE b();' });
    const db = new FakeDb();
    db.appliedNames = ['001_a.sql'];
    expect(await runMigrations(db, dir)).toEqual(['002_b.sql']);
  });

  it('нічого не робить, коли все застосовано', async () => {
    await prepare({ '001_a.sql': 'x' });
    const db = new FakeDb();
    db.appliedNames = ['001_a.sql'];
    expect(await runMigrations(db, dir)).toEqual([]);
  });
});
