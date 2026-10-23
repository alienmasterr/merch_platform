import { describe, expect, it, vi } from 'vitest';
import { ExternalServiceError, OrderStatus } from '@merch/contracts';
import { createNotificationModule } from '../index';
import { NotificationService } from '../application/notification-service';
import { ConsoleNotificationSender } from '../infrastructure/console-notification-sender';
import { InMemoryNotificationSender } from '../infrastructure/in-memory-notification-sender';
import { SmtpNotificationSender } from '../infrastructure/smtp-notification-sender';
import { makeOrderData } from '../../../test-utils/order-fixtures';

describe('NotificationService', () => {
  it('sendReceipt і notifyOrderStatus надсилають відповідні листи', async () => {
    const sender = new InMemoryNotificationSender();
    const service = new NotificationService(sender);
    await service.sendReceipt(makeOrderData());
    await service.notifyOrderStatus(makeOrderData({ status: OrderStatus.PRINTING }));
    expect(sender.sent.map((m) => m.subject)).toEqual(['Чек за замовлення order-1', 'Замовлення order-1: новий статус']);
  });

  it('негатив: помилка сендера прокидається', async () => {
    const service = new NotificationService({ send: async () => Promise.reject(new Error('smtp down')) });
    await expect(service.sendReceipt(makeOrderData())).rejects.toThrow('smtp down');
  });
});

describe('EmailNotificationObserver', () => {
  function setup(order = makeOrderData()) {
    const sender = new InMemoryNotificationSender();
    const orderProvider = vi.fn(async () => order);
    const { observer } = createNotificationModule({ sender, orderProvider });
    return { sender, observer, orderProvider };
  }

  it('PAID: чек; PRINTING, SHIPPED, CANCELLED: оновлення статусу', async () => {
    const { sender, observer } = setup();
    await observer.onOrderStatusChanged('order-1', OrderStatus.PAID);
    await observer.onOrderStatusChanged('order-1', OrderStatus.PRINTING);
    await observer.onOrderStatusChanged('order-1', OrderStatus.SHIPPED);
    await observer.onOrderStatusChanged('order-1', OrderStatus.CANCELLED);
    expect(sender.sent).toHaveLength(4);
    expect(sender.sent[0]?.subject).toContain('Чек');
    expect(sender.sent[2]?.text).toContain('відправлено');
  });

  it('CREATED і PENDING_REVIEW без листа й без звернення до замовлення', async () => {
    const { sender, observer, orderProvider } = setup();
    await observer.onOrderStatusChanged('order-1', OrderStatus.CREATED);
    await observer.onOrderStatusChanged('order-1', OrderStatus.PENDING_REVIEW);
    expect(sender.sent).toHaveLength(0);
    expect(orderProvider).not.toHaveBeenCalled();
  });

  it('негатив: замовлення не знайдено', async () => {
    const sender = new InMemoryNotificationSender();
    const { observer } = createNotificationModule({ sender, orderProvider: async () => Promise.reject(new Error('missing')) });
    await expect(observer.onOrderStatusChanged('x', OrderStatus.SHIPPED)).rejects.toThrow('missing');
  });
});

describe('Senders', () => {
  const message = { to: 'a@b.c', subject: 'S', text: 'T' };

  it('SMTP: передає from і лист транспорту', async () => {
    const sendMail = vi.fn(async () => ({}));
    await new SmtpNotificationSender({ sendMail }, 'shop@x').send(message);
    expect(sendMail).toHaveBeenCalledWith({ from: 'shop@x', to: 'a@b.c', subject: 'S', text: 'T' });
  });

  it('негатив: помилка SMTP стає ExternalServiceError', async () => {
    const sender = new SmtpNotificationSender({ sendMail: async () => Promise.reject(new Error('ECONNREFUSED')) }, 'shop@x');
    await expect(sender.send(message)).rejects.toThrow(ExternalServiceError);
  });

  it('консольний сендер друкує адресата й тему', async () => {
    const log = vi.fn();
    await new ConsoleNotificationSender(log).send(message);
    expect(log.mock.calls[0]?.[0]).toContain('to=a@b.c subject="S"');
  });
});
