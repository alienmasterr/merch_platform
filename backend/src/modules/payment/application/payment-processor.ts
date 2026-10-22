import type {
  IPaymentProcessor,
  IPaymentStrategy,
  PaymentInvoice,
  PaymentNotification,
  PaymentRequest,
} from '@merch/contracts';

/** Context для Strategy: решта системи не знає, який провайдер оплати підключений. */
export class PaymentProcessor implements IPaymentProcessor {
  private strategy: IPaymentStrategy;

  constructor(strategy: IPaymentStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: IPaymentStrategy): void {
    this.strategy = strategy;
  }

  getStrategyName(): string {
    return this.strategy.name;
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentInvoice> {
    return this.strategy.createInvoice(request);
  }

  async handleWebhookNotification(payload: Record<string, unknown>): Promise<PaymentNotification> {
    return this.strategy.parseNotification(payload);
  }

  refund(orderId: string, amount: number): Promise<void> {
    return this.strategy.refund(orderId, amount);
  }
}
