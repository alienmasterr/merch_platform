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
    expect(msg.text).toContain('Адреса доставки: Нова Пошта, Київ, відділення №12.');
  });

  it('чек підставляє назви виробів, якщо вони відомі', () => {
    const msg = new OrderReceiptMessage(makeOrderData(), { itemNames: { p1: 'Худі оверсайз, grey, L' } }).render();
    expect(msg.text).toContain('1. Худі оверсайз, grey, L × 2: 1000.00 грн');
  });

  it('чек без номера транзакції не містить порожнього рядка про неї', () => {
    expect(new OrderReceiptMessage(makeOrderData()).render().text).not.toContain('транзакції');
  });

  it('HTML-чек: рамка, позиції, разом, доставка, транзакція', () => {
    const { html } = new OrderReceiptMessage(makeOrderData({ paymentTransactionId: 'tx-9' }), {
      itemNames: { p1: 'Худі оверсайз, grey, L' },
      orderUrl: 'http://spa/orders/order-1',
    }).render();
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('Дякуємо за оплату!');
    expect(html).toContain('Худі оверсайз, grey, L × 2');
    expect(html).toContain('1070.00 грн');
    expect(html).toContain('Нова Пошта, Київ, відділення №12');
    expect(html).toContain('Номер транзакції: tx-9');
    expect(html).toContain('>Переглянути замовлення</a>');
  });

  it('HTML безпечний: дані користувача екрануються', () => {
    const order = makeOrderData({
      recipient: { ...makeOrderData().recipient, fullName: '<script>alert(1)</script>', city: 'Київ"><img src=x>' },
    });
    const { html } = new OrderReceiptMessage(order, { itemNames: { p1: '<b>xss</b>' } }).render();
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x>');
    expect(html).not.toContain('<b>xss</b>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('HTML статусу: бейдж, ТТН і посилання на трекінг Нової Пошти', () => {
    const { html } = new OrderStatusUpdateMessage(
      makeOrderData({ status: OrderStatus.SHIPPED, ttnNumber: '20450000000001' }),
    ).render();
    expect(html).toContain('>Відправлено</span>');
    expect(html).toContain('20450000000001');
    expect(html).toContain('href="https://novaposhta.ua/tracking/?cargo_number=20450000000001"');
    const cancelled = new OrderStatusUpdateMessage(makeOrderData({ status: OrderStatus.CANCELLED })).render();
    expect(cancelled.html).toContain('>Скасовано</span>');
    expect(cancelled.html).not.toContain('ТТН Нової Пошти');
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
