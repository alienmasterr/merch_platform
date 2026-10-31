import type { IPaymentStrategy } from '@merch/contracts';
import { PaymentProcessor } from './application/payment-processor';

export interface PaymentModuleDeps {
  strategy: IPaymentStrategy;
}

export function createPaymentModule(deps: PaymentModuleDeps) {
  return { processor: new PaymentProcessor(deps.strategy) };
}
