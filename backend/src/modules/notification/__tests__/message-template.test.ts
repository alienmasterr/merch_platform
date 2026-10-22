import { describe, expect, it } from 'vitest';
import { OrderStatus } from '@merch/contracts';
import { OrderReceiptMessage, OrderStatusUpdateMessage } from '../domain/message-template';
import { makeOrderData } from '../../../test-utils/order-fixtures';

describe('MessageTemplate', () => {
  it('чек: позиції, доставка, сума, транзакція, адресат', () => {
    const msg = new OrderReceiptMessage(makeOrderData({ paymentTransactionId: 'tx-9' })).render();
    expect(msg.to).toBe('taras@example.com');
    expect(msg.subject).toBe('Чек за замовлення order-1');
    expect(msg.text).toContain('Вітаємо, Шевченко Тарас!');
    expect(msg.text).toContain('1. Виріб p1 × 2: 1000.00 грн');
    expect(msg.text).toContain('Доставка: 70.00 грн');
    expect(msg.text).toContain('Разом: 1070.00 грн');
    expect(msg.text).toContain('Номер транзакції: tx-9');
  });

  it('чек без номера транзакції не містить порожнього рядка про неї', () => {
    expect(new OrderReceiptMessage(makeOrderData()).render().text).not.toContain('транзакції');
  });

  it('статус: текст для кожного статусу', () => {
    for (const status of Object.values(OrderStatus)) {
      const msg = new OrderStatusUpdateMessage(makeOrderData({ status })).render();
      expect(msg.subject).toBe('Замовлення order-1: новий статус');
      expect(msg.text.length).toBeGreaterThan(30);
    }
  });

  it('SHIPPED: номер ТТН і відділення, або примітка, якщо ТТН ще немає', () => {
    const withTtn = new OrderStatusUpdateMessage(makeOrderData({ status: OrderStatus.SHIPPED, ttnNumber: '2045' })).render();
    expect(withTtn.text).toContain('Номер ТТН: 2045. Відділення №12, Київ.');
    const without = new OrderStatusUpdateMessage(makeOrderData({ status: OrderStatus.SHIPPED })).render();
    expect(without.text).toContain('надішлемо окремо');
  });
});
