import {
  OrderStatus,
  type DeliveryRecipient,
  type IDeliveryService,
  type IOrderObserver,
} from '@merch/contracts';

export type RecipientProvider = (orderId: string) => Promise<DeliveryRecipient>;

export interface TtnStore {
  get(orderId: string): Promise<string | null>;
  save(orderId: string, ttn: string): Promise<void>;
}

export class NovaPoshtaDeliveryObserver implements IOrderObserver {
  private readonly deliveryService: IDeliveryService;
  private readonly recipientProvider: RecipientProvider;
  private readonly ttnStore: TtnStore | undefined;
  private readonly ttnByOrder = new Map<string, string>();
  private readonly inFlight = new Map<string, Promise<void>>();

  constructor(deliveryService: IDeliveryService, recipientProvider: RecipientProvider, ttnStore?: TtnStore) {
    this.deliveryService = deliveryService;
    this.recipientProvider = recipientProvider;
    this.ttnStore = ttnStore;
  }

  onOrderStatusChanged(orderId: string, newStatus: OrderStatus): Promise<void> {
    if (newStatus !== OrderStatus.SHIPPED) return Promise.resolve();
    if (!this.ttnStore && this.ttnByOrder.has(orderId)) return Promise.resolve();

    const running = this.inFlight.get(orderId);
    if (running) return running;

    const task = this.ensureTtn(orderId).finally(() => this.inFlight.delete(orderId));
    this.inFlight.set(orderId, task);
    return task;
  }

  getTtnNumber(orderId: string): string | undefined {
    return this.ttnByOrder.get(orderId);
  }

  private async ensureTtn(orderId: string): Promise<void> {
    const stored = await this.ttnStore?.get(orderId);
    if (stored) {
      this.ttnByOrder.set(orderId, stored);
      return;
    }
    let ttn = this.ttnByOrder.get(orderId);
    if (!ttn) {
      const recipient = await this.recipientProvider(orderId);
      ttn = await this.deliveryService.generateTTN(orderId, recipient);
      this.ttnByOrder.set(orderId, ttn);
    }
    await this.ttnStore?.save(orderId, ttn);
  }
}
