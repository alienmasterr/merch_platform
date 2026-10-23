import { describe, expect, it, vi } from 'vitest';
import { PaymentStatus, ValidationError, type IPaymentStrategy } from '@merch/contracts';
import { createPaymentModule } from '../index';
import { PaymentProcessor } from '../application/payment-processor';
import { StubPaymentStrategy } from '../infrastructure/stub-payment-strategy';

function fakeStrategy(name: string): IPaymentStrategy {
  return {
    name,
    createInvoice: vi.fn((r) => ({ ...r, checkoutUrl: `https://${name}/pay`, data: 'd', signature: 's' })),
    parseNotification: vi.fn(() => ({ orderId: 'o1', status: PaymentStatus.SUCCESS, amount: 1, currency: 'UAH', transactionId: null })),
    refund: vi.fn(async () => {}),
  };
}

const request = { orderId: 'o1', amount: 100, currency: 'UAH' as const, description: 'x' };

describe('PaymentProcessor (Strategy)', () => {
  it('делегує поточній стратегії', async () => {
    const a = fakeStrategy('a');
    const processor = new PaymentProcessor(a);
    expect((await processor.initiatePayment(request)).checkoutUrl).toBe('https://a/pay');
    expect((await processor.handleWebhookNotification({})).status).toBe(PaymentStatus.SUCCESS);
    await processor.refund('o1', 100);
    expect(a.refund).toHaveBeenCalledWith('o1', 100);
  });

  it('setStrategy підміняє провайдера без зміни коду клієнтів', async () => {
    const a = fakeStrategy('a');
    const b = fakeStrategy('b');
    const processor = new PaymentProcessor(a);
    processor.setStrategy(b);
    expect(processor.getStrategyName()).toBe('b');
    expect((await processor.initiatePayment(request)).checkoutUrl).toBe('https://b/pay');
    expect(a.createInvoice).not.toHaveBeenCalled();
  });

  it('негатив: помилка стратегії прокидається', async () => {
    const a = fakeStrategy('a');
    vi.mocked(a.parseNotification).mockImplementation(() => {
      throw new ValidationError('bad');
    });
    await expect(createPaymentModule({ strategy: a }).processor.handleWebhookNotification({})).rejects.toThrow('bad');
  });
});

describe('StubPaymentStrategy', () => {
  it('рахунок веде на сторінку результату SPA, підписаний callback проходить перевірку', () => {
    const stub = new StubPaymentStrategy('http://spa/result');
    expect(stub.createInvoice(request).checkoutUrl).toBe('http://spa/result?orderId=o1');
    const n = stub.parseNotification(StubPaymentStrategy.successCallback('o1', 100, '42'));
    expect(n).toMatchObject({ orderId: 'o1', status: PaymentStatus.SUCCESS, amount: 100, transactionId: '42' });
  });

  it('негатив: підроблений callback відхиляється; refund лише запамʼятовується', async () => {
    const stub = new StubPaymentStrategy();
    const cb = StubPaymentStrategy.successCallback('o1', 100);
    expect(() => stub.parseNotification({ ...cb, signature: 'forged' })).toThrow(ValidationError);
    await stub.refund('o1', 100);
    expect(stub.refunds).toEqual([{ orderId: 'o1', amount: 100 }]);
  });
});
