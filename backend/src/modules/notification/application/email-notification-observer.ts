import { OrderStatus, type IOrderObserver, type OrderData } from '@merch/contracts';
import type { NotificationService } from './notification-service';

export type OrderProvider = (orderId: string) => Promise<OrderData>;

const STATUS_EMAILS: ReadonlySet<OrderStatus> = new Set([OrderStatus.PRINTING, OrderStatus.SHIPPED, OrderStatus.CANCELLED]);

export class EmailNotificationObserver implements IOrderObserver {
  private readonly notifications: NotificationService;
  private readonly orderProvider: OrderProvider;

  constructor(notifications: NotificationService, orderProvider: OrderProvider) {
    this.notifications = notifications;
    this.orderProvider = orderProvider;
  }

  async onOrderStatusChanged(orderId: string, newStatus: OrderStatus): Promise<void> {
    if (newStatus !== OrderStatus.PAID && !STATUS_EMAILS.has(newStatus)) return;
    const order = await this.orderProvider(orderId);
    if (newStatus === OrderStatus.PAID) await this.notifications.sendReceipt(order);
    else await this.notifications.notifyOrderStatus({ ...order, status: newStatus });
  }
}
