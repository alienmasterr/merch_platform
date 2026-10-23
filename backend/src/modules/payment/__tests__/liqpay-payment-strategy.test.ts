import { describe, expect, it, vi } from 'vitest';
import { ExternalServiceError, PaymentStatus, ValidationError } from '@merch/contracts';
import { decodeLiqPayData, encodeLiqPayData, isValidLiqPaySignature, signLiqPayData } from '../domain/liqpay-signature';
import { LiqPayPaymentStrategy, type LiqPayOptions } from '../infrastructure/liqpay-payment-strategy';

const KEY = 'sandbox_private';

function strategy(overrides: Partial<LiqPayOptions> = {}) {
  const postForm = vi.fn(async (): Promise<unknown> => ({ result: 'ok', status: 'reversed' }));
  const s = new LiqPayPaymentStrategy({
    publicKey: 'sandbox_public',
    privateKey: KEY,
    sandbox: true,
    http: { postForm },
    resultUrl: 'http://spa/result',
    serverUrl: 'http://api/payments/webhook',
    ...overrides,
  });
  return { s, postForm };
}

function callback(body: Record<string, unknown>, key = KEY) {
  const data = encodeLiqPayData(body);
  return { data, signature: signLiqPayData(key, data) };
}

const request = { orderId: 'o1', amount: 550, currency: 'UAH' as const, description: 'Замовлення o1' };

describe('LiqPay signature', () => {
  it('підпис = base64(sha1(key + data + key)), перевірка відкидає змінені дані', () => {
    const data = encodeLiqPayData({ a: 1 });
    const sig = signLiqPayData(KEY, data);
    expect(Buffer.from(sig, 'base64')).toHaveLength(20); // sha1
    expect(isValidLiqPaySignature(KEY, data, sig)).toBe(true);
    expect(isValidLiqPaySignature(KEY, encodeLiqPayData({ a: 2 }), sig)).toBe(false);
    expect(isValidLiqPaySignature('other', data, sig)).toBe(false);
    expect(isValidLiqPaySignature(KEY, data, 'short')).toBe(false);
  });

  it('decode повертає обʼєкт і відкидає не-обʼєкти', () => {
    expect(decodeLiqPayData(encodeLiqPayData({ x: 'y' }))).toEqual({ x: 'y' });
    expect(() => decodeLiqPayData(Buffer.from('[1]').toString('base64'))).toThrow();
  });
});

describe('LiqPayPaymentStrategy', () => {
  it('createInvoice: параметри Checkout API v3, підпис і посилання на оплату', () => {
    const invoice = strategy().s.createInvoice(request);
    expect(decodeLiqPayData(invoice.data)).toEqual({
      version: 3,
      public_key: 'sandbox_public',
      action: 'pay',
      amount: 550,
      currency: 'UAH',
      description: 'Замовлення o1',
      order_id: 'o1',
      result_url: 'http://spa/result',
      server_url: 'http://api/payments/webhook',
      sandbox: 1,
    });
    expect(isValidLiqPaySignature(KEY, invoice.data, invoice.signature)).toBe(true);
    const url = new URL(invoice.checkoutUrl);
    expect(url.origin + url.pathname).toBe('https://www.liqpay.ua/api/3/checkout');
    expect(url.searchParams.get('data')).toBe(invoice.data);
    expect(invoice).toMatchObject({ orderId: 'o1', amount: 550, currency: 'UAH' });
  });

  it('createInvoice у бойовому режимі не передає sandbox; негатив: сума має бути додатною', () => {
    const { s } = strategy({ sandbox: false });
    expect(decodeLiqPayData(s.createInvoice(request).data)).not.toHaveProperty('sandbox');
    expect(() => s.createInvoice({ ...request, amount: 0 })).toThrow(ValidationError);
  });

  it('parseNotification: валідний callback', () => {
    const n = strategy().s.parseNotification(
      callback({ order_id: 'o1', status: 'success', amount: 550, currency: 'UAH', payment_id: 123 }),
    );
    expect(n).toEqual({ orderId: 'o1', status: PaymentStatus.SUCCESS, amount: 550, currency: 'UAH', transactionId: '123' });
  });

  it('parseNotification: невалідний підпис, відсутні поля, битий data, без order_id', () => {
    const { s } = strategy();
    const body = { order_id: 'o1', status: 'success', amount: 1, currency: 'UAH' };
    expect(() => s.parseNotification(callback(body, 'attacker-key'))).toThrow(/Invalid LiqPay signature/);
    expect(() => s.parseNotification({ data: 'x' })).toThrow(ValidationError);
    const broken = Buffer.from('not json').toString('base64');
    expect(() => s.parseNotification({ data: broken, signature: signLiqPayData(KEY, broken) })).toThrow(/base64 JSON/);
    expect(() => s.parseNotification(callback({ status: 'success' }))).toThrow(/order_id/);
  });

  it('мапінг статусів LiqPay', () => {
    const { s } = strategy();
    const status = (st: string) => s.parseNotification(callback({ order_id: 'o', status: st, amount: 1, currency: 'UAH' })).status;
    expect(status('success')).toBe(PaymentStatus.SUCCESS);
    expect(status('sandbox')).toBe(PaymentStatus.SUCCESS);
    expect(status('failure')).toBe(PaymentStatus.FAILURE);
    expect(status('error')).toBe(PaymentStatus.FAILURE);
    expect(status('reversed')).toBe(PaymentStatus.REFUNDED);
    expect(status('processing')).toBe(PaymentStatus.PENDING);
  });

  it('у бойовому режимі тестовий платіж "sandbox" не вважається оплатою', () => {
    const { s } = strategy({ sandbox: false });
    expect(s.parseNotification(callback({ order_id: 'o', status: 'sandbox', amount: 1, currency: 'UAH' })).status).toBe(
      PaymentStatus.FAILURE,
    );
  });

  it('refund: підписаний запит action=refund на /api/request', async () => {
    const { s, postForm } = strategy();
    await s.refund('o1', 550);
    const [url, fields] = postForm.mock.calls[0] as unknown as [string, { data: string; signature: string }];
    expect(url).toBe('https://www.liqpay.ua/api/request');
    expect(decodeLiqPayData(fields.data)).toMatchObject({ action: 'refund', order_id: 'o1', amount: 550, version: 3 });
    expect(isValidLiqPaySignature(KEY, fields.data, fields.signature)).toBe(true);
  });

  it('негатив: refund з помилкою від LiqPay', async () => {
    const { s, postForm } = strategy();
    postForm.mockResolvedValueOnce({ result: 'error', err_description: 'payment not found' });
    await expect(s.refund('o1', 1)).rejects.toThrow(ExternalServiceError);
    postForm.mockResolvedValueOnce(null);
    await expect(s.refund('o1', 1)).rejects.toThrow(/unknown error/);
  });
});
