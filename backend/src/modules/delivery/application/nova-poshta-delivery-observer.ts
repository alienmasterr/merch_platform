import {
  OrderStatus,
  type DeliveryRecipient,
  type IDeliveryService,
  type IOrderObserver,
} from '@merch/contracts';

export type RecipientProvider = (orderId: string) => Promise<DeliveryRecipient>;

/**
 * Тонкий Observer: реагує на статус SHIPPED і делегує створення ТТН IDeliveryService.
 * Отримувача підтягує через RecipientProvider (у composition root це обгортка над order repository).
 */
export class NovaPoshtaDeliveryObserver implements IOrderObserver {
  private readonly deliveryService: IDeliveryService;
  private readonly recipientProvider: RecipientProvider;
  private readonly ttnByOrder = new Map<string, string>();
  private readonly inFlight = new Map<string, Promise<void>>();

  constructor(deliveryService: IDeliveryService, recipientProvider: RecipientProvider) {
    this.deliveryService = deliveryService;
    this.recipientProvider = recipientProvider;
  }

  onOrderStatusChanged(orderId: string, newStatus: OrderStatus): Promise<void> {
    if (newStatus !== OrderStatus.SHIPPED) return Promise.resolve();
    if (this.ttnByOrder.has(orderId)) return Promise.resolve();

    const running = this.inFlight.get(orderId);
    if (running) return running;

    const task = this.generate(orderId).finally(() => this.inFlight.delete(orderId));
    this.inFlight.set(orderId, task);
    return task;
  }

  getTtnNumber(orderId: string): string | undefined {
    return this.ttnByOrder.get(orderId);
  }

  private async generate(orderId: string): Promise<void> {
    const recipient = await this.recipientProvider(orderId);
    const ttn = await this.deliveryService.generateTTN(orderId, recipient);
    this.ttnByOrder.set(orderId, ttn);
  }
}
