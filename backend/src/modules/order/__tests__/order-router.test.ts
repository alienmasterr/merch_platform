import express from 'express';
import { beforeEach, describe, expect, it } from 'vitest';
import { PaymentStatus } from '@merch/contracts';
import { errorHandler } from '../../../infra/http/error-handler';
import { withServer } from '../../../test-utils/with-server';
import { createOrderModule } from '../index';
import { InMemoryOrderRepository } from '../infrastructure/in-memory-order-repository';
import { FakeProductRepo, fakePayments, fakeProduct, validRecipient } from './helpers';

describe('Order REST', () => {
  let app: express.Express;
  let payments: ReturnType<typeof fakePayments>;

  beforeEach(() => {
    payments = fakePayments();
    payments.handleWebhookNotification.mockImplementation(async () => ({
      orderId: 'o1', status: PaymentStatus.SUCCESS, amount: 570, currency: 'UAH', transactionId: 'tx',
    }));
    const { router } = createOrderModule({
      orderRepo: new InMemoryOrderRepository(),
      productRepo: new FakeProductRepo(fakeProduct('p1', 500)),
      deliveryService: { calculateShippingCost: async () => 70, generateTTN: async () => 'TTN' },
      paymentProcessor: payments,
      idGenerator: () => 'o1',
      logError: () => {},
    });
    app = express();
    app.use(express.json());
    app.use(router);
    app.use(errorHandler);
  });

  const json = { 'content-type': 'application/json' };
  const manager = { ...json, 'x-user-role': 'manager' };

  async function create(url: string) {
    return fetch(`${url}/orders`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ items: [{ customProductId: 'p1' }], recipient: validRecipient }),
    });
  }

  async function pay(url: string) {
    return fetch(`${url}/payments/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: 'd', signature: 's' }).toString(),
    });
  }

  it('POST /orders → 201 з сумою, дозволеними переходами; GET /orders/:id', async () => {
    await withServer(app, async (url) => {
      const res = await create(url);
      expect(res.status).toBe(201);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toMatchObject({
        id: 'o1',
        status: 'CREATED',
        total: 570,
        currency: 'UAH',
        allowedNextStatuses: ['PAID', 'CANCELLED'],
        items: [{ customProductId: 'p1', quantity: 1, unitPrice: 500, lineTotal: 500 }],
      });
      expect(((await (await fetch(`${url}/orders/o1`)).json()) as { id: string }).id).toBe('o1');
    });
  });

  it('негатив: 400 на невалідне тіло й отримувача, 404 на невідоме замовлення', async () => {
    await withServer(app, async (url) => {
      const bad = await fetch(`${url}/orders`, { method: 'POST', headers: json, body: JSON.stringify({ items: [] }) });
      expect(bad.status).toBe(400);
      const badRecipient = await fetch(`${url}/orders`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ items: [{ customProductId: 'p1' }], recipient: { ...validRecipient, phone: '1' } }),
      });
      expect(badRecipient.status).toBe(400);
      expect(((await badRecipient.json()) as { error: string }).error).toBe('VALIDATION_ERROR');
      expect((await fetch(`${url}/orders/nope`)).status).toBe(404);
    });
  });

  it('checkout → рахунок; webhook (form-urlencoded) → PENDING_REVIEW; повторний checkout → 409', async () => {
    await withServer(app, async (url) => {
      await create(url);
      const checkout = await fetch(`${url}/orders/o1/checkout`, { method: 'POST' });
      expect(((await checkout.json()) as { checkoutUrl: string }).checkoutUrl).toBe('https://pay/x');

      const hook = await pay(url);
      expect(hook.status).toBe(200);
      expect(payments.handleWebhookNotification).toHaveBeenCalledWith({ data: 'd', signature: 's' });
      expect(await hook.json()).toEqual({ ok: true });
      expect(((await (await fetch(`${url}/orders/o1`)).json()) as { status: string }).status).toBe('PENDING_REVIEW');
      expect((await fetch(`${url}/orders/o1/checkout`, { method: 'POST' })).status).toBe(409);
    });
  });

  it('негатив: webhook без data/signature → 400', async () => {
    await withServer(app, async (url) => {
      const res = await fetch(`${url}/payments/webhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'foo=bar',
      });
      expect(res.status).toBe(400);
    });
  });

  it('менеджер: список на перевірці, схвалення макета, відправка, повтор сповіщень', async () => {
    await withServer(app, async (url) => {
      await create(url);
      await pay(url);
      const list = (await (await fetch(`${url}/manager/orders`, { headers: manager })).json()) as { id: string }[];
      expect(list.map((o) => o.id)).toEqual(['o1']);
      expect(await (await fetch(`${url}/manager/orders?status=SHIPPED`, { headers: manager })).json()).toEqual([]);

      const verified = await fetch(`${url}/manager/orders/o1/verify-mockup`, {
        method: 'POST',
        headers: manager,
        body: JSON.stringify({ approved: true }),
      });
      expect(await verified.json()).toMatchObject({ status: 'PRINTING', warnings: [] });

      const shipped = await fetch(`${url}/manager/orders/o1/status`, {
        method: 'PATCH',
        headers: manager,
        body: JSON.stringify({ status: 'SHIPPED' }),
      });
      expect(await shipped.json()).toMatchObject({ status: 'SHIPPED', allowedNextStatuses: [] });

      const retry = await fetch(`${url}/manager/orders/o1/notify`, { method: 'POST', headers: manager });
      expect(retry.status).toBe(200);
    });
  });

  it('менеджер відхиляє макет → повернення коштів і CANCELLED', async () => {
    await withServer(app, async (url) => {
      await create(url);
      await pay(url);
      const res = await fetch(`${url}/manager/orders/o1/verify-mockup`, {
        method: 'POST',
        headers: manager,
        body: JSON.stringify({ approved: false }),
      });
      expect(await res.json()).toMatchObject({ status: 'CANCELLED' });
      expect(payments.refund).toHaveBeenCalledWith('o1', 570);
    });
  });

  it('негатив: без ролі менеджера 403, невалідний статус 400, заборонений перехід 409', async () => {
    await withServer(app, async (url) => {
      await create(url);
      expect((await fetch(`${url}/manager/orders`)).status).toBe(403);
      expect((await fetch(`${url}/manager/orders`, { headers: { 'x-user-role': 'admin' } })).status).toBe(403);
      const badStatus = await fetch(`${url}/manager/orders/o1/status`, {
        method: 'PATCH',
        headers: manager,
        body: JSON.stringify({ status: 'LOST' }),
      });
      expect(badStatus.status).toBe(400);
      const conflict = await fetch(`${url}/manager/orders/o1/status`, {
        method: 'PATCH',
        headers: manager,
        body: JSON.stringify({ status: 'SHIPPED' }),
      });
      expect(conflict.status).toBe(409);
    });
  });
});
