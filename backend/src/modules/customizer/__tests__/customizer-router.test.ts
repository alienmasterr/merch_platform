import express from 'express';
import { beforeEach, describe, expect, it } from 'vitest';
import { errorHandler } from '../../../infra/http/error-handler';
import { createCustomizerModule } from '../index';
import { InMemoryCustomMerchRepository } from '../infrastructure/in-memory-custom-merch-repository';
import { InMemoryStorageService } from '../infrastructure/in-memory-storage-service';
import { InMemoryCatalogRepository } from '../../catalog/infrastructure/in-memory-catalog-repository';
import { makeTee, tees } from '../../../test-utils/fixtures';
import { withServer } from '../../../test-utils/with-server';
import { printData } from './helpers';

describe('Customizer REST', () => {
  let app: express.Express;

  beforeEach(async () => {
    const catalog = new InMemoryCatalogRepository();
    await catalog.saveCategory(tees);
    await catalog.save(makeTee());
    const { router } = createCustomizerModule({
      catalogRepo: catalog,
      productRepo: new InMemoryCustomMerchRepository(),
      storage: new InMemoryStorageService(),
    });
    app = express();
    app.use(express.json());
    app.use(router);
    app.use(errorHandler);
  });

  const json = { 'content-type': 'application/json' };

  it('POST /customizer/uploads приймає multipart-файл', async () => {
    await withServer(app, async (url) => {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), 'logo.png');
      const res = await fetch(`${url}/customizer/uploads`, { method: 'POST', body: form });
      expect(res.status).toBe(201);
      expect(((await res.json()) as { printFileUrl: string }).printFileUrl).toContain('prints/');
    });
  });

  it('негатив: без файлу 400, чужий формат 400', async () => {
    await withServer(app, async (url) => {
      const empty = await fetch(`${url}/customizer/uploads`, { method: 'POST', body: new FormData() });
      expect(empty.status).toBe(400);
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array([1])]), 'virus.exe');
      expect((await fetch(`${url}/customizer/uploads`, { method: 'POST', body: form })).status).toBe(400);
    });
  });

  it("повний флоу: створити продукт, потім отримати його з прев'ю і ціною", async () => {
    await withServer(app, async (url) => {
      const created = await fetch(`${url}/customizer/products`, { method: 'POST', headers: json, body: JSON.stringify({ baseItemId: 'tee-1', prints: [printData()] }) });
      expect(created.status).toBe(201);
      const dto = (await created.json()) as { id: string; totalCost: number; previewImageUrl: string };
      expect(dto.totalCost).toBe(450);
      expect(dto.previewImageUrl).toContain('previews/');

      const fetched = await fetch(`${url}/customizer/products/${dto.id}`);
      expect(fetched.status).toBe(200);
      expect(((await fetched.json()) as { id: string }).id).toBe(dto.id);
    });
  });

  it('негатив: валідація тіла, невідомий товар, невалідна геометрія', async () => {
    await withServer(app, async (url) => {
      const post = (body: unknown) => fetch(`${url}/customizer/products`, { method: 'POST', headers: json, body: JSON.stringify(body) });
      expect((await post({ baseItemId: 'tee-1', prints: [] })).status).toBe(400);
      expect((await post({ baseItemId: 'tee-1', prints: [printData({ printFileUrl: 'javascript:alert(1)' })] })).status).toBe(400);
      expect((await post({ baseItemId: 'nope', prints: [printData()] })).status).toBe(404);
      expect((await post({ baseItemId: 'tee-1', prints: [printData({ widthMm: 999 })] })).status).toBe(400);
      expect((await fetch(`${url}/customizer/products/nope`)).status).toBe(404);
    });
  });
});
