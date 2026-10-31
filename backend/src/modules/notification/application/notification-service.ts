import type { INotificationSender, OrderData } from '@merch/contracts';
import { OrderReceiptMessage, OrderStatusUpdateMessage, type ItemNames } from '../domain/message-template';

export type ItemDescriber = (customProductId: string) => Promise<string | null>;

export type OrderUrlBuilder = (orderId: string) => string;

export interface NotificationServiceOptions {
  describeItem?: ItemDescriber;
  orderUrl?: OrderUrlBuilder;
}

export class NotificationService {
  private readonly sender: INotificationSender;
  private readonly describeItem: ItemDescriber | undefined;
  private readonly orderUrl: OrderUrlBuilder | undefined;

  constructor(sender: INotificationSender, options: NotificationServiceOptions = {}) {
    this.sender = sender;
    this.describeItem = options.describeItem;
    this.orderUrl = options.orderUrl;
  }

  notifyOrderStatus(order: OrderData): Promise<void> {
    return this.sender.send(new OrderStatusUpdateMessage(order, this.linkFor(order)).render());
  }

  async sendReceipt(order: OrderData): Promise<void> {
    const itemNames = await this.itemNames(order);
    return this.sender.send(new OrderReceiptMessage(order, { ...this.linkFor(order), itemNames }).render());
  }

  private linkFor(order: OrderData): { orderUrl?: string } {
    return this.orderUrl ? { orderUrl: this.orderUrl(order.id) } : {};
  }

  private async itemNames(order: OrderData): Promise<ItemNames> {
    const describe = this.describeItem;
    if (!describe) return {};
    const entries = await Promise.all(
      order.items.map(async (i) => [i.customProductId, await describe(i.customProductId).catch(() => null)] as const),
    );
    return Object.fromEntries(entries.filter((e): e is readonly [string, string] => e[1] !== null));
  }
}
