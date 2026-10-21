import type { IDeliveryService } from '@merch/contracts';

/** Dev-заглушка, коли NOVA_POSHTA_API_KEY не заданий: фіксована ціна й фейковий номер ТТН. */
export class StubDeliveryService implements IDeliveryService {
  async calculateShippingCost(): Promise<number> {
    return 70;
  }

  async generateTTN(orderId: string): Promise<string> {
    return `DEV-${orderId}`;
  }
}
