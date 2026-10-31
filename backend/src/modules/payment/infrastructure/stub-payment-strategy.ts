import type { IPaymentStrategy, PaymentInvoice, PaymentNotification, PaymentRequest } from '@merch/contracts';
import { encodeLiqPayData, signLiqPayData } from '../domain/liqpay-signature';
import type { FormHttpClient } from './form-http-client';
import { LiqPayPaymentStrategy } from './liqpay-payment-strategy';

export const STUB_PRIVATE_KEY = 'dev-stub-private-key';

export const randomPaymentDelayMs = (): number => 1000 + Math.floor(Math.random() * 4001);

export interface StubAutoConfirmOptions {
  webhookUrl: string;
  http: FormHttpClient;
  delayMs?: () => number;
  log?: (message: string) => void;
}

export class StubPaymentStrategy implements IPaymentStrategy {
  readonly name = 'stub';
  readonly refunds: { orderId: string; amount: number }[] = [];
  private readonly inner: LiqPayPaymentStrategy;
  private readonly resultUrl: string;
  private readonly autoConfirm: StubAutoConfirmOptions | undefined;

  constructor(resultUrl = 'http://localhost:5173/payment-result', autoConfirm?: StubAutoConfirmOptions) {
    this.resultUrl = resultUrl;
    this.autoConfirm = autoConfirm;
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
    if (this.autoConfirm) this.scheduleConfirmation(this.autoConfirm, request);
    return { ...invoice, checkoutUrl: url.toString() };
  }

  parseNotification(payload: Record<string, unknown>): PaymentNotification {
    return this.inner.parseNotification(payload);
  }

  async refund(orderId: string, amount: number): Promise<void> {
    this.refunds.push({ orderId, amount });
  }

  static successCallback(orderId: string, amount: number, paymentId = '1'): { data: string; signature: string } {
    const data = encodeLiqPayData({ order_id: orderId, status: 'sandbox', amount, currency: 'UAH', payment_id: paymentId });
    return { data, signature: signLiqPayData(STUB_PRIVATE_KEY, data) };
  }

  private scheduleConfirmation(options: StubAutoConfirmOptions, request: PaymentRequest): void {
    const { webhookUrl, http, delayMs = randomPaymentDelayMs, log = console.warn } = options;
    const timer = setTimeout(() => {
      const callback = StubPaymentStrategy.successCallback(request.orderId, request.amount, `stub-${Date.now()}`);
      http.postForm(webhookUrl, callback).catch((error: unknown) => {
        log(`[payment-stub] callback for order ${request.orderId} failed: ${String(error)}`);
      });
    }, delayMs());
    timer.unref?.();
  }
}
