import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaymentStatus, ValidationError, type IPaymentStrategy } from '@merch/contracts';
import { createPaymentModule } from '../index';
import { PaymentProcessor } from '../application/payment-processor';
import { randomPaymentDelayMs, StubPaymentStrategy } from '../infrastructure/stub-payment-strategy';

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

  describe('автопідтвердження оплати', () => {
    afterEach(() => vi.useRealTimers());

    it('після затримки шле підписаний callback "успішно" на webhook', async () => {
      vi.useFakeTimers();
      const http = { postForm: vi.fn().mockResolvedValue({ ok: true }) };
      const stub = new StubPaymentStrategy('http://spa/result', {
        webhookUrl: 'http://api/payments/webhook',
        http,
        delayMs: () => 3000,
      });
      stub.createInvoice(request);
      await vi.advanceTimersByTimeAsync(2999);
      expect(http.postForm).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);

      expect(http.postForm).toHaveBeenCalledWith('http://api/payments/webhook', expect.any(Object));
      const callback = vi.mocked(http.postForm).mock.calls[0]?.[1] as Record<string, string>;
      expect(stub.parseNotification(callback)).toMatchObject({
        orderId: 'o1',
        status: PaymentStatus.SUCCESS,
        amount: request.amount,
      });
    });

    it('негатив: без autoConfirm callback не надсилається; збій callback лише логується', async () => {
      vi.useFakeTimers();
      const log = vi.fn();
      const failing = { postForm: vi.fn().mockRejectedValue(new Error('down')) };
      new StubPaymentStrategy('http://spa/result').createInvoice(request);
      new StubPaymentStrategy('http://spa/result', {
        webhookUrl: 'http://api/payments/webhook',
        http: failing,
        delayMs: () => 10,
        log,
      }).createInvoice(request);
      await vi.advanceTimersByTimeAsync(10);
      expect(failing.postForm).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith(expect.stringContaining('callback for order o1 failed'));
    });

    it('затримка за замовчуванням від 1 до 5 с', () => {
      for (let i = 0; i < 200; i += 1) {
        const ms = randomPaymentDelayMs();
        expect(ms).toBeGreaterThanOrEqual(1000);
        expect(ms).toBeLessThanOrEqual(5000);
      }
    });
  });
});
