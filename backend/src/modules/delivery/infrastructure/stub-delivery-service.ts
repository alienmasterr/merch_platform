import type { IDeliveryService } from '@merch/contracts';

export class StubDeliveryService implements IDeliveryService {
  async calculateShippingCost(): Promise<number> {
    return 70;
  }

  async generateTTN(orderId: string): Promise<string> {
    return `DEV-${orderId}`;
  }
}
