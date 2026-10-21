import express from 'express';
import { describe, expect, it } from 'vitest';
import { ExternalServiceError } from '@merch/contracts';
import { errorHandler } from '../../../infra/http/error-handler';
import { createDeliveryModule } from '../index';
import { withServer } from '../../../test-utils/with-server';

function buildApp(calc: (city: string, kg: number) => Promise<number>) {
  const { router } = createDeliveryModule({
    deliveryService: { calculateShippingCost: calc, generateTTN: async () => 'x' },
    recipientProvider: async () => ({ fullName: 'A B', phone: '0', city: 'c', warehouse: '1' }),
  });
  const app = express();
  app.use(router);
  app.use(errorHandler);
  return app;
}

describe('Delivery REST', () => {
  it('GET /delivery/shipping-cost повертає вартість', async () => {
    await withServer(buildApp(async () => 85), async (url) => {
      const res = await fetch(`${url}/delivery/shipping-cost?city=${encodeURIComponent('Львів')}&weightKg=1.5`);
      expect(await res.json()).toEqual({ city: 'Львів', weightKg: 1.5, cost: 85, currency: 'UAH' });
    });
  });

  it('негатив: без city або з поганою вагою 400', async () => {
    await withServer(buildApp(async () => 1), async (url) => {
      expect((await fetch(`${url}/delivery/shipping-cost?weightKg=1`)).status).toBe(400);
      expect((await fetch(`${url}/delivery/shipping-cost?city=X&weightKg=-1`)).status).toBe(400);
    });
  });

  it('негатив: збій Нової Пошти дає 502', async () => {
    const app = buildApp(async () => { throw new ExternalServiceError('NP down'); });
    await withServer(app, async (url) => {
      expect((await fetch(`${url}/delivery/shipping-cost?city=X&weightKg=1`)).status).toBe(502);
    });
  });
});
