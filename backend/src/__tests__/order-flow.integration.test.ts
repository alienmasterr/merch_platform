import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { loadConfig } from '../infra/config/config';
import { buildContainer } from '../infra/config/container';
import { InMemoryNotificationSender } from '../modules/notification/infrastructure/in-memory-notification-sender';
import { StubPaymentStrategy } from '../modules/payment/infrastructure/stub-payment-strategy';
import { withServer } from '../test-utils/with-server';

describe('Order flow (memory)', () => {
  async function start() {
    const container = await buildContainer(loadConfig({ PERSISTENCE: 'memory', STORAGE_DRIVER: 'memory' }));
    const sender = new InMemoryNotificationSender();
    const { app } = createApp({ ...container.deps, notificationSender: sender });
    return { app, sender };
  }

  const json = { 'content-type': 'application/json' };
  const manager = { ...json, 'x-user-role': 'manager' };

  async function customProduct(url: string): Promise<{ id: string; totalCost: number }> {
    const res = await fetch(`${url}/customizer/products`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        baseItemId: 'tee-white-m',
        prints: [{ printFileUrl: 'http://x/logo.png', placement: 'CHEST', technology: 'DTG', widthMm: 200, heightMm: 200 }],
      }),
    });
    return (await res.json()) as { id: string; totalCost: number };
  }

  async function orderAndPay(url: string) {
    const product = await customProduct(url);
    const created = await fetch(`${url}/orders`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        items: [{ customProductId: product.id, quantity: 2 }],
        recipient: { fullName: 'Шевченко Тарас', phone: '050 123 45 67', email: 'taras@example.com', city: 'Київ', warehouse: '12' },
      }),
    });
    expect(created.status).toBe(201);
    const order = (await created.json()) as { id: string; total: number; shippingCost: number };
    expect(order.total).toBe(product.totalCost * 2 + 70);

    const invoice = (await (await fetch(`${url}/orders/${order.id}/checkout`, { method: 'POST' })).json()) as { checkoutUrl: string };
    expect(invoice.checkoutUrl).toContain(`orderId=${order.id}`);

    const webhook = () =>
      fetch(`${url}/payments/webhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(StubPaymentStrategy.successCallback(order.id, order.total, '777')).toString(),
      });
    expect((await webhook()).status).toBe(200);
    expect((await webhook()).status).toBe(200);
    return { order, product };
  }

  it('кастомізація → замовлення → оплата → схвалення макета → друк → відправка з ТТН і листами', async () => {
    const { app, sender } = await start();
    await withServer(app, async (url) => {
      const { order, product } = await orderAndPay(url);

      const review = (await (await fetch(`${url}/manager/orders`, { headers: manager })).json()) as { id: string }[];
      expect(review.map((o) => o.id)).toEqual([order.id]);

      await fetch(`${url}/manager/orders/${order.id}/verify-mockup`, {
        method: 'POST',
        headers: manager,
        body: JSON.stringify({ approved: true }),
      });
      expect(((await (await fetch(`${url}/customizer/products/${product.id}`)).json()) as { mockupApproved: boolean }).mockupApproved).toBe(
        true,
      );

      const shipped = await fetch(`${url}/manager/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: manager,
        body: JSON.stringify({ status: 'SHIPPED' }),
      });
      expect(await shipped.json()).toMatchObject({ status: 'SHIPPED', ttnNumber: `DEV-${order.id}`, warnings: [] });

      const final = (await (await fetch(`${url}/orders/${order.id}`)).json()) as Record<string, unknown>;
      expect(final).toMatchObject({ status: 'SHIPPED', ttnNumber: `DEV-${order.id}`, paymentTransactionId: '777' });

      expect(sender.sent.map((m) => m.subject)).toEqual([
        `Чек за замовлення ${order.id}`,
        `Замовлення ${order.id}: новий статус`,
        `Замовлення ${order.id}: новий статус`,
      ]);
      expect(sender.sent[2]?.text).toContain(`Номер ТТН: DEV-${order.id}`);
    });
  });

  it('відхилений макет: повернення коштів, CANCELLED і лист клієнту', async () => {
    const { app, sender } = await start();
    await withServer(app, async (url) => {
      const { order } = await orderAndPay(url);
      const res = await fetch(`${url}/manager/orders/${order.id}/verify-mockup`, {
        method: 'POST',
        headers: manager,
        body: JSON.stringify({ approved: false }),
      });
      expect(await res.json()).toMatchObject({ status: 'CANCELLED' });
      expect(sender.sent.at(-1)?.text).toContain('кошти повернуто');
    });
  });

  it('негатив: підроблений callback відхиляється, замовлення лишається неоплаченим', async () => {
    const { app } = await start();
    await withServer(app, async (url) => {
      const product = await customProduct(url);
      const created = (await (
        await fetch(`${url}/orders`, {
          method: 'POST',
          headers: json,
          body: JSON.stringify({
            items: [{ customProductId: product.id }],
            recipient: { fullName: 'A B', phone: '0501234567', email: 'a@b.ua', city: 'Львів', warehouse: '1' },
          }),
        })
      ).json()) as { id: string; total: number };
      const forged = { ...StubPaymentStrategy.successCallback(created.id, created.total), signature: 'forged' };
      const res = await fetch(`${url}/payments/webhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(forged).toString(),
      });
      expect(res.status).toBe(400);
      expect(((await (await fetch(`${url}/orders/${created.id}`)).json()) as { status: string }).status).toBe('CREATED');
    });
  });
});
