import express from 'express';
import { beforeEach, describe, expect, it } from 'vitest';
import { errorHandler } from '../../../infra/http/error-handler';
import { createCatalogModule } from '../index';
import { InMemoryCatalogRepository } from '../infrastructure/in-memory-catalog-repository';
import { makeMug, makeTee, tees } from '../../../test-utils/fixtures';
import { withServer } from '../../../test-utils/with-server';

async function buildApp() {
  const repo = new InMemoryCatalogRepository();
  await repo.saveCategory(tees);
  await repo.save(makeTee());
  await repo.save(makeMug());
  const { router } = createCatalogModule({ catalogRepo: repo, idGenerator: () => 'generated-id' });
  const app = express();
  app.use(express.json());
  app.use(router);
  app.use(errorHandler);
  return app;
}

const admin = { 'content-type': 'application/json', 'x-user-role': 'admin' };

describe('Catalog REST', () => {
  let app: express.Express;
  beforeEach(async () => {
    app = await buildApp();
  });

  it('GET /catalog повертає список, фільтр працює', async () => {
    await withServer(app, async (url) => {
      const all = (await (await fetch(`${url}/catalog`)).json()) as unknown[];
      expect(all).toHaveLength(2);
      const filtered = (await (await fetch(`${url}/catalog?color=white&maxPrice=200`)).json()) as { id: string }[];
      expect(filtered.map((i) => i.id)).toEqual(['mug-1']);
    });
  });

  it('GET /catalog/:id повертає товар з дозволеними зонами; 404 для невідомого', async () => {
    await withServer(app, async (url) => {
      const ok = await fetch(`${url}/catalog/tee-1`);
      expect(ok.status).toBe(200);
      expect(((await ok.json()) as { allowedPlacements: string[] }).allowedPlacements).toContain('CHEST');
      expect((await fetch(`${url}/catalog/nope`)).status).toBe(404);
    });
  });

  it('GET /catalog/categories', async () => {
    await withServer(app, async (url) => {
      const cats = (await (await fetch(`${url}/catalog/categories`)).json()) as { slug: string }[];
      expect(cats[0]?.slug).toBe('tees');
    });
  });

  it('негатив: некоректний query дає 400', async () => {
    await withServer(app, async (url) => {
      expect((await fetch(`${url}/catalog?minPrice=abc`)).status).toBe(400);
    });
  });

  it('адмін: без ролі 403', async () => {
    await withServer(app, async (url) => {
      const res = await fetch(`${url}/admin/catalog`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      expect(res.status).toBe(403);
    });
  });

  it('адмін: створення товару 201, а некоректне тіло 400', async () => {
    await withServer(app, async (url) => {
      const body = { kind: 'ACCESSORY', title: 'Cap', basePrice: 250, size: 'ONE', color: 'black', categoryId: 'cat-tees', accessoryType: 'cap' };
      const created = await fetch(`${url}/admin/catalog`, { method: 'POST', headers: admin, body: JSON.stringify(body) });
      expect(created.status).toBe(201);
      expect(((await created.json()) as { id: string }).id).toBe('generated-id');
      const bad = await fetch(`${url}/admin/catalog`, { method: 'POST', headers: admin, body: JSON.stringify({ kind: 'TOP' }) });
      expect(bad.status).toBe(400);
      const noCat = await fetch(`${url}/admin/catalog`, { method: 'POST', headers: admin, body: JSON.stringify({ ...body, categoryId: 'ghost' }) });
      expect(noCat.status).toBe(404);
    });
  });

  it('адмін: PATCH змінює ціну й наявність; порожній PATCH 400', async () => {
    await withServer(app, async (url) => {
      const res = await fetch(`${url}/admin/catalog/tee-1`, { method: 'PATCH', headers: admin, body: JSON.stringify({ basePrice: 999, inStock: false }) });
      const dto = (await res.json()) as { basePrice: number; inStock: boolean };
      expect(dto).toMatchObject({ basePrice: 999, inStock: false });
      const empty = await fetch(`${url}/admin/catalog/tee-1`, { method: 'PATCH', headers: admin, body: '{}' });
      expect(empty.status).toBe(400);
    });
  });
});
