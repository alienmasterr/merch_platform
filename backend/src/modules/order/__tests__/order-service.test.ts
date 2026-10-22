import { describe, expect, it, vi } from 'vitest';
import {
  ConflictError,
  ExternalServiceError,
  NotFoundError,
  OrderStatus,
  PaymentStatus,
  ValidationError,
  type IOrderObserver,
} from '@merch/contracts';
import { WEIGHT_PER_ITEM_KG } from '../application/order-service';
import { setupService, validRecipient } from './helpers';

const createRequest = {
  items: [
    { customProductId: 'p1', quantity: 2 },
    { customProductId: 'p2', quantity: 1 },
  ],
  recipient: validRecipient,
};

/** Замовлення, оплачене через webhook: статус PENDING_REVIEW. */
async function paidOrder(ctx: ReturnType<typeof setupService>) {
  const order = await ctx.service.createOrder(createRequest);
  await ctx.service.handlePaymentWebhook({ orderId: order.id, amount: 1320 });
  return order.id;
}

function recorder() {
  const statuses: OrderStatus[] = [];
  const observer: IOrderObserver = { onOrderStatusChanged: (_id, s) => void statuses.push(s) };
  return { statuses, observer };
}

describe('OrderService.createOrder', () => {
  it('фіксує ціни виробів, рахує доставку за вагою, зберігає', async () => {
    const ctx = setupService();
    const order = await ctx.service.createOrder(createRequest);
    expect(order).toMatchObject({
      id: 'order-1',
      status: OrderStatus.CREATED,
      shippingCost: 70,
      items: [
        { customProductId: 'p1', quantity: 2, unitPrice: 500 },
        { customProductId: 'p2', quantity: 1, unitPrice: 250 },
      ],
    });
    expect(order.recipient.phone).toBe('380501234567');
    expect(ctx.delivery.calculateShippingCost).toHaveBeenCalledWith('Київ', 3 * WEIGHT_PER_ITEM_KG);
    expect(await ctx.orderRepo.findById('order-1')).toEqual(order);
  });

  it('негатив: невідомий виріб, порожнє замовлення, невалідний отримувач', async () => {
    const ctx = setupService();
    await expect(ctx.service.createOrder({ ...createRequest, items: [{ customProductId: 'nope', quantity: 1 }] })).rejects.toThrow(
      NotFoundError,
    );
    await expect(ctx.service.createOrder({ ...createRequest, items: [] })).rejects.toThrow(ValidationError);
    await expect(ctx.service.createOrder({ ...createRequest, recipient: { ...validRecipient, email: 'x' } })).rejects.toThrow(
      ValidationError,
    );
    expect(await ctx.orderRepo.findById('order-1')).toBeNull();
  });
});

describe('OrderService.checkout і webhook', () => {
  it('checkout виставляє рахунок на повну суму', async () => {
    const ctx = setupService();
    const { id } = await ctx.service.createOrder(createRequest);
    const invoice = await ctx.service.checkout(id);
    expect(ctx.payments.initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: id, amount: 1320, currency: 'UAH' }),
    );
    expect(invoice.checkoutUrl).toBe('https://pay/x');
  });

  it('негатив: checkout неіснуючого або вже оплаченого замовлення', async () => {
    const ctx = setupService();
    await expect(ctx.service.checkout('nope')).rejects.toThrow(NotFoundError);
    const id = await paidOrder(ctx);
    await expect(ctx.service.checkout(id)).rejects.toThrow(ConflictError);
  });

  it('успішна оплата: PAID → PENDING_REVIEW, транзакція збережена, спостерігачі отримали обидва статуси', async () => {
    const ctx = setupService();
    const { statuses, observer } = recorder();
    ctx.service.attach(observer);
    const id = await paidOrder(ctx);
    const order = await ctx.service.getOrder(id);
    expect(order.status).toBe(OrderStatus.PENDING_REVIEW);
    expect(order.paymentTransactionId).toBe('tx-1');
    expect(statuses).toEqual([OrderStatus.PAID, OrderStatus.PENDING_REVIEW]);
    expect(await ctx.service.listByStatus(OrderStatus.PENDING_REVIEW)).toHaveLength(1);
  });

  it('ідемпотентність: повторний webhook не змінює стан і не сповіщає вдруге', async () => {
    const ctx = setupService();
    const { statuses, observer } = recorder();
    ctx.service.attach(observer);
    const id = await paidOrder(ctx);
    await ctx.service.handlePaymentWebhook({ orderId: id, amount: 1320 });
    expect(statuses).toHaveLength(2);
    expect((await ctx.service.getOrder(id)).status).toBe(OrderStatus.PENDING_REVIEW);
  });

  it('неуспішна чи незавершена оплата нічого не змінює', async () => {
    const ctx = setupService();
    const { id } = await ctx.service.createOrder(createRequest);
    for (const status of [PaymentStatus.FAILURE, PaymentStatus.PENDING, PaymentStatus.REFUNDED]) {
      await ctx.service.handlePaymentWebhook({ orderId: id, amount: 1320, status });
    }
    expect((await ctx.service.getOrder(id)).status).toBe(OrderStatus.CREATED);
  });

  it('негатив: невалідний підпис (помилка процесора), сума не збігається, невідоме замовлення', async () => {
    const ctx = setupService();
    const { id } = await ctx.service.createOrder(createRequest);
    ctx.payments.handleWebhookNotification.mockRejectedValueOnce(new ValidationError('Invalid LiqPay signature'));
    await expect(ctx.service.handlePaymentWebhook({})).rejects.toThrow(/signature/);
    await expect(ctx.service.handlePaymentWebhook({ orderId: id, amount: 1 })).rejects.toThrow(ConflictError);
    await expect(ctx.service.handlePaymentWebhook({ orderId: 'nope', amount: 1 })).rejects.toThrow(NotFoundError);
    expect((await ctx.service.getOrder(id)).status).toBe(OrderStatus.CREATED);
  });

  it('помилка спостерігача (наприклад, SMTP) не ламає webhook, а логується', async () => {
    const ctx = setupService();
    ctx.service.attach({ onOrderStatusChanged: async () => Promise.reject(new Error('smtp down')) });
    const id = await paidOrder(ctx);
    expect((await ctx.service.getOrder(id)).status).toBe(OrderStatus.PENDING_REVIEW);
    expect(ctx.logError).toHaveBeenCalledWith(expect.stringContaining('smtp down'));
  });
});

describe('OrderService.verifyMockup', () => {
  it('схвалено: макети позначені, статус PRINTING', async () => {
    const ctx = setupService();
    const id = await paidOrder(ctx);
    const { order, warnings } = await ctx.service.verifyMockup(id, true);
    expect(order.status).toBe(OrderStatus.PRINTING);
    expect(warnings).toEqual([]);
    expect((await ctx.productRepo.findById('p1'))?.isMockupApproved()).toBe(true);
    expect(ctx.payments.refund).not.toHaveBeenCalled();
  });

  it('відхилено: повернення всієї суми, CANCELLED, макети не схвалені', async () => {
    const ctx = setupService();
    const id = await paidOrder(ctx);
    const { order } = await ctx.service.verifyMockup(id, false);
    expect(ctx.payments.refund).toHaveBeenCalledWith(id, 1320);
    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(ctx.productRepo.saved).toEqual(['p1', 'p2']);
    expect((await ctx.productRepo.findById('p2'))?.isMockupApproved()).toBe(false);
  });

  it('негатив: повернення впало, статус і макети не змінюються', async () => {
    const ctx = setupService();
    const id = await paidOrder(ctx);
    ctx.payments.refund.mockRejectedValueOnce(new ExternalServiceError('LiqPay refund failed'));
    await expect(ctx.service.verifyMockup(id, false)).rejects.toThrow(ExternalServiceError);
    expect((await ctx.service.getOrder(id)).status).toBe(OrderStatus.PENDING_REVIEW);
    expect(ctx.productRepo.saved).toEqual([]);
  });

  it('негатив: замовлення не на перевірці', async () => {
    const ctx = setupService();
    const { id } = await ctx.service.createOrder(createRequest);
    await expect(ctx.service.verifyMockup(id, true)).rejects.toThrow(ConflictError);
  });

  it('негатив: виріб замовлення зник', async () => {
    const ctx = setupService();
    const id = await paidOrder(ctx);
    ctx.productRepo.products.delete('p2');
    await expect(ctx.service.verifyMockup(id, true)).rejects.toThrow(NotFoundError);
  });
});

describe('OrderService.changeStatus (менеджер)', () => {
  async function printing(ctx: ReturnType<typeof setupService>) {
    const id = await paidOrder(ctx);
    await ctx.service.verifyMockup(id, true);
    return id;
  }

  it('PRINTING → SHIPPED', async () => {
    const ctx = setupService();
    const id = await printing(ctx);
    expect((await ctx.service.changeStatus(id, OrderStatus.SHIPPED)).order.status).toBe(OrderStatus.SHIPPED);
  });

  it('скасування неоплаченого без повернення, оплаченого з поверненням', async () => {
    const ctx = setupService();
    const { id } = await ctx.service.createOrder(createRequest);
    await ctx.service.changeStatus(id, OrderStatus.CANCELLED);
    expect(ctx.payments.refund).not.toHaveBeenCalled();

    const paid = await paidOrder(ctx);
    await ctx.service.changeStatus(paid, OrderStatus.CANCELLED);
    expect(ctx.payments.refund).toHaveBeenCalledWith(paid, 1320);
  });

  it('негатив: оплату, перевірку макета й друк не можна поставити вручну; після друку не скасувати', async () => {
    const ctx = setupService();
    const { id } = await ctx.service.createOrder(createRequest);
    await expect(ctx.service.changeStatus(id, OrderStatus.PAID)).rejects.toThrow(/payment notification/);
    await expect(ctx.service.changeStatus(id, OrderStatus.PENDING_REVIEW)).rejects.toThrow(/payment notification/);
    await expect(ctx.service.changeStatus(id, OrderStatus.PRINTING)).rejects.toThrow(/mockup verification/);
    await expect(ctx.service.changeStatus(id, OrderStatus.SHIPPED)).rejects.toThrow(ConflictError);

    const p = await printing(ctx);
    await expect(ctx.service.changeStatus(p, OrderStatus.CANCELLED)).rejects.toThrow(/cannot be cancelled/);
  });

  it('помилка спостерігача повертається менеджеру як попередження, повтор сповіщення працює', async () => {
    const ctx = setupService();
    const id = await printing(ctx);
    const flaky = { fail: true };
    const onOrderStatusChanged = vi.fn(async () => {
      if (flaky.fail) throw new Error('Nova Poshta down');
    });
    ctx.service.attach({ onOrderStatusChanged });

    const shipped = await ctx.service.changeStatus(id, OrderStatus.SHIPPED);
    expect(shipped.order.status).toBe(OrderStatus.SHIPPED);
    expect(shipped.warnings).toEqual(['Nova Poshta down']);

    flaky.fail = false;
    expect((await ctx.service.retryNotifications(id)).warnings).toEqual([]);
    expect(onOrderStatusChanged).toHaveBeenLastCalledWith(id, OrderStatus.SHIPPED);
  });
});

describe('OrderService: ТТН і отримувач', () => {
  it('setTtnNumber / getTtnNumber / getRecipient; detach', async () => {
    const ctx = setupService();
    const { id } = await ctx.service.createOrder(createRequest);
    expect(await ctx.service.getTtnNumber(id)).toBeNull();
    await ctx.service.setTtnNumber(id, '20450000000000');
    expect(await ctx.service.getTtnNumber(id)).toBe('20450000000000');
    expect((await ctx.service.getRecipient(id)).warehouse).toBe('12');

    const { statuses, observer } = recorder();
    ctx.service.attach(observer);
    ctx.service.detach(observer);
    ctx.service.detach(observer);
    await ctx.service.changeStatus(id, OrderStatus.CANCELLED);
    expect(statuses).toEqual([]);
  });

  it('негатив: неіснуюче замовлення', async () => {
    const ctx = setupService();
    await expect(ctx.service.setTtnNumber('nope', '1')).rejects.toThrow(NotFoundError);
    await expect(ctx.service.getRecipient('nope')).rejects.toThrow(NotFoundError);
  });
});
