import type { IPaymentStrategy, PaymentInvoice, PaymentNotification, PaymentRequest } from '@merch/contracts';
import { encodeLiqPayData, signLiqPayData } from '../domain/liqpay-signature';
import { LiqPayPaymentStrategy } from './liqpay-payment-strategy';

/** Ключ dev-заглушки. Ним же підписується ручний webhook під час розробки. */
export const STUB_PRIVATE_KEY = 'dev-stub-private-key';

/**
 * Dev-заглушка, коли LIQPAY_* не задані: той самий формат і перевірка підпису, що в LiqPay,
 * але "сторінка оплати" одразу веде на resultUrl, а повернення коштів лише запамʼятовується.
 */
export class StubPaymentStrategy implements IPaymentStrategy {
  readonly name = 'stub';
  readonly refunds: { orderId: string; amount: number }[] = [];
  private readonly inner: LiqPayPaymentStrategy;
  private readonly resultUrl: string;

  constructor(resultUrl = 'http://localhost:5173/payment-result') {
    this.resultUrl = resultUrl;
    this.inner = new LiqPayPaymentStrategy({
      publicKey: 'stub',
      privateKey: STUB_PRIVATE_KEY,
      sandbox: true,
      http: { postForm: async () => ({ result: 'ok' }) },
    });
  }

  createInvoice(request: PaymentRequest): PaymentInvoice {
    const invoice = this.inner.createInvoice(request);
    const url = new URL(this.resultUrl);
    url.searchParams.set('orderId', request.orderId);
    return { ...invoice, checkoutUrl: url.toString() };
  }

  parseNotification(payload: Record<string, unknown>): PaymentNotification {
    return this.inner.parseNotification(payload);
  }

  async refund(orderId: string, amount: number): Promise<void> {
    this.refunds.push({ orderId, amount });
  }

  /** Підписаний callback "оплата успішна" для ручної перевірки флоу й тестів. */
  static successCallback(orderId: string, amount: number, paymentId = '1'): { data: string; signature: string } {
    const data = encodeLiqPayData({ order_id: orderId, status: 'sandbox', amount, currency: 'UAH', payment_id: paymentId });
    return { data, signature: signLiqPayData(STUB_PRIVATE_KEY, data) };
  }
}
