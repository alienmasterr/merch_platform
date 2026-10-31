import {
  ExternalServiceError,
  PaymentStatus,
  ValidationError,
  type IPaymentStrategy,
  type PaymentInvoice,
  type PaymentNotification,
  type PaymentRequest,
} from '@merch/contracts';
import { decodeLiqPayData, encodeLiqPayData, isValidLiqPaySignature, signLiqPayData } from '../domain/liqpay-signature';
import type { FormHttpClient } from './form-http-client';

export interface LiqPayOptions {
  publicKey: string;
  privateKey: string;
  http: FormHttpClient;
  sandbox: boolean;
  resultUrl?: string;
  serverUrl?: string;
  checkoutUrl?: string;
  apiUrl?: string;
}

const CHECKOUT_URL = 'https://www.liqpay.ua/api/3/checkout';
const API_URL = 'https://www.liqpay.ua/api/request';

export class LiqPayPaymentStrategy implements IPaymentStrategy {
  readonly name = 'liqpay';
  private readonly options: LiqPayOptions;

  constructor(options: LiqPayOptions) {
    this.options = options;
  }

  createInvoice(request: PaymentRequest): PaymentInvoice {
    if (!(request.amount > 0)) throw new ValidationError('Payment amount must be positive');
    const data = encodeLiqPayData({
      version: 3,
      public_key: this.options.publicKey,
      action: 'pay',
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      order_id: request.orderId,
      ...(this.options.resultUrl && { result_url: this.options.resultUrl }),
      ...(this.options.serverUrl && { server_url: this.options.serverUrl }),
      ...(this.options.sandbox && { sandbox: 1 }),
    });
    const signature = signLiqPayData(this.options.privateKey, data);
    const base = this.options.checkoutUrl ?? CHECKOUT_URL;
    const query = new URLSearchParams({ data, signature }).toString();
    return {
      orderId: request.orderId,
      amount: request.amount,
      currency: request.currency,
      checkoutUrl: `${base}?${query}`,
      data,
      signature,
    };
  }

  parseNotification(payload: Record<string, unknown>): PaymentNotification {
    const { data, signature } = payload;
    if (typeof data !== 'string' || typeof signature !== 'string' || !data || !signature) {
      throw new ValidationError('LiqPay callback must contain data and signature');
    }
    if (!isValidLiqPaySignature(this.options.privateKey, data, signature)) {
      throw new ValidationError('Invalid LiqPay signature');
    }
    let body: Record<string, unknown>;
    try {
      body = decodeLiqPayData(data);
    } catch {
      throw new ValidationError('LiqPay data is not valid base64 JSON');
    }
    if (typeof body.order_id !== 'string' || !body.order_id) throw new ValidationError('LiqPay callback has no order_id');

    return {
      orderId: body.order_id,
      status: this.mapStatus(String(body.status ?? '')),
      amount: Number(body.amount),
      currency: String(body.currency ?? ''),
      transactionId: body.payment_id === undefined || body.payment_id === null ? null : String(body.payment_id),
    };
  }

  async refund(orderId: string, amount: number): Promise<void> {
    const data = encodeLiqPayData({
      version: 3,
      public_key: this.options.publicKey,
      action: 'refund',
      order_id: orderId,
      amount,
    });
    const response = (await this.options.http.postForm(this.options.apiUrl ?? API_URL, {
      data,
      signature: signLiqPayData(this.options.privateKey, data),
    })) as { result?: string; status?: string; err_description?: string } | null;
    if (response?.result !== 'ok') {
      throw new ExternalServiceError(`LiqPay refund failed: ${response?.err_description ?? response?.status ?? 'unknown error'}`);
    }
  }

  private mapStatus(status: string): PaymentStatus {
    if (status === 'success') return PaymentStatus.SUCCESS;
    if (status === 'sandbox') return this.options.sandbox ? PaymentStatus.SUCCESS : PaymentStatus.FAILURE;
    if (status === 'failure' || status === 'error') return PaymentStatus.FAILURE;
    if (status === 'reversed') return PaymentStatus.REFUNDED;
    return PaymentStatus.PENDING;
  }
}
