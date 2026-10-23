import {
  OrderStatus,
  type DeliveryRecipient,
  type IDeliveryService,
  type IOrderObserver,
} from '@merch/contracts';

export type RecipientProvider = (orderId: string) => Promise<DeliveryRecipient>;

/** Постійне сховище ТТН (у composition root це замовлення). Без нього ТТН живе лише в памʼяті. */
export interface TtnStore {
  get(orderId: string): Promise<string | null>;
  save(orderId: string, ttn: string): Promise<void>;
}

/**
 * Тонкий Observer: реагує на статус SHIPPED і делегує створення ТТН IDeliveryService.
 * Отримувача підтягує через RecipientProvider (у composition root це обгортка над order repository).
 * Якщо передано TtnStore, номер зберігається там і переживає перезапуск, а повторна подія не створює другу ТТН.
 */
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
    // ТТН уже запамʼятована: якщо збереження впаде, повтор лише збереже її, а не створить нову
    await this.ttnStore?.save(orderId, ttn);
  }
}
