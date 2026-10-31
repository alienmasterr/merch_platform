import type { PaymentStatus } from '../enums/payment-status';

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: 'UAH';
  description: string;
}

export interface PaymentInvoice {
  orderId: string;
  amount: number;
  currency: 'UAH';
  checkoutUrl: string;
  data: string;
  signature: string;
}

export interface PaymentNotification {
  orderId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  transactionId: string | null;
}

export interface IPaymentStrategy {
  readonly name: string;
  createInvoice(request: PaymentRequest): PaymentInvoice;
  parseNotification(payload: Record<string, unknown>): PaymentNotification;
  refund(orderId: string, amount: number): Promise<void>;
}

export interface IPaymentProcessor {
  setStrategy(strategy: IPaymentStrategy): void;
  initiatePayment(request: PaymentRequest): Promise<PaymentInvoice>;
  handleWebhookNotification(payload: Record<string, unknown>): Promise<PaymentNotification>;
  refund(orderId: string, amount: number): Promise<void>;
}
