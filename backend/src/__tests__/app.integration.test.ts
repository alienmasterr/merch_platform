import { OrderStatus } from '@merch/contracts';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { loadConfig } from '../infra/config/config';
import { buildContainer } from '../infra/config/container';
import { withServer } from '../test-utils/with-server';

/** B4.1: наскрізний сценарій модулів B на in-memory залежностях (без БД і мережі). */
describe('Backend integration (memory)', () => {
  async function start() {
    const container = await buildContainer(loadConfig({ PERSISTENCE: 'memory', STORAGE_DRIVER: 'memory' }));
    return createApp(container.deps);
  }

  it('каталог, завантаження принта, кастомний продукт, вартість доставки', async () => {
    const { app } = await start();
    await withServer(app, async (url) => {
      expect(await (await fetch(`${url}/health`)).json()).toEqual({ status: 'ok' });

      // 1. каталог (seed)
      const catalog = (await (await fetch(`${url}/catalog?color=white`)).json()) as { id: string }[];
      expect(catalog.map((i) => i.id)).toContain('tee-white-m');

      // 2. завантаження принта
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }), 'logo.png');
      const upload = await fetch(`${url}/customizer/uploads`, { method: 'POST', body: form });
      const { printFileUrl } = (await upload.json()) as { printFileUrl: string };

      // 3. кастомний продукт
      const created = await fetch(`${url}/customizer/products`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          baseItemId: 'tee-white-m',
          prints: [{ printFileUrl, placement: 'CHEST', technology: 'DTG', widthMm: 200, heightMm: 200, offsetX: 0, offsetY: 0, scale: 1 }],
        }),
      });
      expect(created.status).toBe(201);
      const product = (await created.json()) as { id: string; totalCost: number; previewImageUrl: string; baseItem: { id: string } };
      expect(product.baseItem.id).toBe('tee-white-m');
      expect(product.totalCost).toBe(350 + 50 + 100);
      expect(product.previewImageUrl).toContain('previews/');

      // 4. доставка (stub без ключа Нової Пошти)
      const shipping = (await (await fetch(`${url}/delivery/shipping-cost?city=Lviv&weightKg=1`)).json()) as { cost: number };
      expect(shipping.cost).toBe(70);
    });
  });

  it('адмін змінює ціну й наявність, а зміни видно в публічному каталозі та в кастомайзері', async () => {
    const { app } = await start();
    await withServer(app, async (url) => {
      const admin = { 'content-type': 'application/json', 'x-user-role': 'admin' };
      await fetch(`${url}/admin/catalog/tee-white-m`, { method: 'PATCH', headers: admin, body: JSON.stringify({ basePrice: 400, inStock: false }) });

      const item = (await (await fetch(`${url}/catalog/tee-white-m`)).json()) as { basePrice: number; inStock: boolean };
      expect(item).toMatchObject({ basePrice: 400, inStock: false });

      const created = await fetch(`${url}/customizer/products`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          baseItemId: 'tee-white-m',
          prints: [{ printFileUrl: 'http://x/a.png', placement: 'CHEST', technology: 'DTG', widthMm: 100, heightMm: 100 }],
        }),
      });
      expect(created.status).toBe(400);
    });
  });

  it('delivery observer доступний для підписки на Order (контракт зі C)', async () => {
    const { modules } = await start();
    // інші статуси ігноруються; для неіснуючого замовлення SHIPPED кидає NotFound з order-репозиторію
    await expect(modules.delivery.observer.onOrderStatusChanged('o1', OrderStatus.PAID)).resolves.toBeUndefined();
    await expect(modules.delivery.observer.onOrderStatusChanged('o1', OrderStatus.SHIPPED)).rejects.toThrow(/not found/);
  });
});
