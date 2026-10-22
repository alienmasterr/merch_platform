import { describe, expect, it, vi } from 'vitest';
import { ConflictError, OrderStatus, ValidationError, type IOrderObserver } from '@merch/contracts';
import { ObserverNotificationError, Order } from '../domain/order';
import { ORDER_TRANSITIONS } from '../domain/order-transitions';
import { createRecipientDetails } from '../domain/recipient-details';
import { validRecipient } from './helpers';

function newOrder() {
  return Order.create({
    id: 'o1',
    items: [
      { customProductId: 'p1', quantity: 2, unitPrice: 500 },
      { customProductId: 'p2', quantity: 1, unitPrice: 249.99 },
    ],
    recipient: validRecipient,
    shippingCost: 70,
    createdAt: new Date('2026-10-22T10:00:00Z'),
  });
}

const observer = (): IOrderObserver & { onOrderStatusChanged: ReturnType<typeof vi.fn> } => ({
  onOrderStatusChanged: vi.fn(async () => {}),
});

describe('Order', () => {
  it('create: статус CREATED, нормалізований отримувач, сума з доставкою', () => {
    const order = newOrder();
    expect(order.getStatus()).toBe(OrderStatus.CREATED);
    expect(order.getRecipient().phone).toBe('380501234567');
    expect(order.calculateTotal()).toBe(1319.99);
    expect(order.toData()).toMatchObject({ ttnNumber: null, paymentTransactionId: null, createdAt: '2026-10-22T10:00:00.000Z' });
  });

  it('негатив create: без позицій, кількість, ціна, доставка', () => {
    const base = { id: 'o', recipient: validRecipient, shippingCost: 0, createdAt: new Date() };
    expect(() => Order.create({ ...base, items: [] })).toThrow(ValidationError);
    expect(() => Order.create({ ...base, items: [{ customProductId: 'p', quantity: 0, unitPrice: 1 }] })).toThrow(/quantity/);
    expect(() => Order.create({ ...base, items: [{ customProductId: 'p', quantity: 1.5, unitPrice: 1 }] })).toThrow(/quantity/);
    expect(() => Order.create({ ...base, items: [{ customProductId: 'p', quantity: 1, unitPrice: -1 }] })).toThrow(/price/);
    expect(() => Order.create({ ...base, shippingCost: -1, items: [{ customProductId: 'p', quantity: 1, unitPrice: 1 }] })).toThrow(
      /Shipping/,
    );
  });

  it('повний шлях статусів CREATED → PAID → PENDING_REVIEW → PRINTING → SHIPPED', async () => {
    const order = newOrder();
    for (const s of [OrderStatus.PAID, OrderStatus.PENDING_REVIEW, OrderStatus.PRINTING, OrderStatus.SHIPPED]) {
      await order.changeStatus(s);
    }
    expect(order.getStatus()).toBe(OrderStatus.SHIPPED);
    expect(order.getAllowedTransitions()).toEqual([]);
  });

  it('негатив: заборонені переходи кидають ConflictError і не змінюють статус', async () => {
    for (const [from, allowed] of Object.entries(ORDER_TRANSITIONS)) {
      for (const to of Object.values(OrderStatus)) {
        if (allowed.includes(to)) continue;
        const order = Order.fromData({ ...newOrder().toData(), status: from as OrderStatus });
        expect(order.canTransitionTo(to)).toBe(false);
        await expect(order.changeStatus(to)).rejects.toThrow(ConflictError);
        expect(order.getStatus()).toBe(from);
      }
    }
  });

  it('скасувати можна до друку, після PRINTING ні', () => {
    for (const s of [OrderStatus.CREATED, OrderStatus.PAID, OrderStatus.PENDING_REVIEW]) {
      expect(Order.fromData({ ...newOrder().toData(), status: s }).canTransitionTo(OrderStatus.CANCELLED)).toBe(true);
    }
    expect(Order.fromData({ ...newOrder().toData(), status: OrderStatus.PRINTING }).canTransitionTo(OrderStatus.CANCELLED)).toBe(false);
  });

  it('Observer: attach, сповіщення з id і новим статусом, detach', async () => {
    const order = newOrder();
    const a = observer();
    const b = observer();
    order.attach(a);
    order.attach(a); // повторний attach не дублює
    order.attach(b);
    await order.changeStatus(OrderStatus.PAID);
    expect(a.onOrderStatusChanged).toHaveBeenCalledTimes(1);
    expect(a.onOrderStatusChanged).toHaveBeenCalledWith('o1', OrderStatus.PAID);

    order.detach(a);
    order.detach(a);
    await order.changeStatus(OrderStatus.PENDING_REVIEW);
    expect(a.onOrderStatusChanged).toHaveBeenCalledTimes(1);
    expect(b.onOrderStatusChanged).toHaveBeenCalledTimes(2);
  });

  it('спостерігачі викликаються по черзі в порядку attach', async () => {
    const calls: string[] = [];
    const order = newOrder();
    order.attach({ onOrderStatusChanged: async () => { await new Promise((r) => setTimeout(r, 5)); calls.push('first'); } });
    order.attach({ onOrderStatusChanged: () => { calls.push('second'); } });
    await order.changeStatus(OrderStatus.PAID);
    expect(calls).toEqual(['first', 'second']);
  });

  it('негатив: помилка одного спостерігача не зупиняє інших, але повідомляється', async () => {
    const order = newOrder();
    const ok = observer();
    order.attach({ onOrderStatusChanged: () => { throw new Error('np down'); } });
    order.attach({ onOrderStatusChanged: async () => Promise.reject('plain string') });
    order.attach(ok);
    const err = await order.changeStatus(OrderStatus.PAID).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ObserverNotificationError);
    expect((err as ObserverNotificationError).failures.map((f) => f.message)).toEqual(['np down', 'plain string']);
    expect(ok.onOrderStatusChanged).toHaveBeenCalled();
    expect(order.getStatus()).toBe(OrderStatus.PAID);
  });

  it('ТТН і транзакція; fromData/toData не ділять стан', () => {
    const order = newOrder();
    order.setTtnNumber('2045');
    order.setPaymentTransactionId('tx');
    const data = order.toData();
    data.items[0]!.quantity = 99;
    expect(order.toData()).toMatchObject({ ttnNumber: '2045', paymentTransactionId: 'tx' });
    expect(order.toData().items[0]?.quantity).toBe(2);
    expect(() => order.setTtnNumber(' ')).toThrow(ValidationError);
  });
});

describe('createRecipientDetails', () => {
  it('нормалізує імʼя, телефон і пробіли', () => {
    expect(createRecipientDetails({ ...validRecipient, fullName: '  Шевченко   Тарас ', phone: '0501234567', city: ' Львів ', warehouse: ' 3 ' }))
      .toEqual({ fullName: 'Шевченко Тарас', phone: '380501234567', email: 'taras@example.com', city: 'Львів', warehouse: '3' });
    expect(createRecipientDetails({ ...validRecipient, phone: '380501234567' }).phone).toBe('380501234567');
  });

  it.each([
    ['fullName', 'Тарас', /full name/],
    ['phone', '12345', /phone/],
    ['phone', '+1 202 555 0100', /phone/],
    ['email', 'not-an-email', /email/],
    ['city', '  ', /city/],
    ['warehouse', 'Відділення 5', /warehouse/],
  ])('негатив: %s = "%s"', (field, value, message) => {
    expect(() => createRecipientDetails({ ...validRecipient, [field]: value })).toThrow(message);
  });
});
