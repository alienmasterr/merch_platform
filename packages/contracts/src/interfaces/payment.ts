import type { PaymentStatus } from '../enums/payment-status';

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: 'UAH';
  description: string;
}

/** Дані для переходу клієнта на сторінку оплати. */
export interface PaymentInvoice {
  orderId: string;
  amount: number;
  currency: 'UAH';
  /** Готове посилання на сторінку оплати (GET). */
  checkoutUrl: string;
  /** Для POST-форми на сторінку оплати (LiqPay: поля data і signature). */
  data: string;
  signature: string;
}

/** Перевірене повідомлення платіжного сервісу (webhook). */
export interface PaymentNotification {
  orderId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  transactionId: string | null;
}

/** Strategy: конкретний платіжний провайдер. */
export interface IPaymentStrategy {
  readonly name: string;
  createInvoice(request: PaymentRequest): PaymentInvoice;
  /** Перевіряє підпис і розбирає webhook. Невалідний підпис: ValidationError. */
  parseNotification(payload: Record<string, unknown>): PaymentNotification;
  refund(orderId: string, amount: number): Promise<void>;
}

export interface IPaymentProcessor {
  setStrategy(strategy: IPaymentStrategy): void;
  initiatePayment(request: PaymentRequest): Promise<PaymentInvoice>;
  handleWebhookNotification(payload: Record<string, unknown>): Promise<PaymentNotification>;
  refund(orderId: string, amount: number): Promise<void>;
}
