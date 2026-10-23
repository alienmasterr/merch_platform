import { OrderStatus, type IOrderObserver, type OrderData } from '@merch/contracts';
import type { NotificationService } from './notification-service';

export type OrderProvider = (orderId: string) => Promise<OrderData>;

/** На які статуси клієнт отримує лист. PAID: чек; CREATED і PENDING_REVIEW без листа (одразу йде чек). */
const STATUS_EMAILS: ReadonlySet<OrderStatus> = new Set([OrderStatus.PRINTING, OrderStatus.SHIPPED, OrderStatus.CANCELLED]);

/** Observer: на зміну статусу замовлення надсилає клієнту лист через NotificationService. */
export class EmailNotificationObserver implements IOrderObserver {
  private readonly notifications: NotificationService;
  private readonly orderProvider: OrderProvider;

  constructor(notifications: NotificationService, orderProvider: OrderProvider) {
    this.notifications = notifications;
    this.orderProvider = orderProvider;
  }

  async onOrderStatusChanged(orderId: string, newStatus: OrderStatus): Promise<void> {
    if (newStatus !== OrderStatus.PAID && !STATUS_EMAILS.has(newStatus)) return;
    // свіжий знімок: попередні спостерігачі могли дописати дані (наприклад, ТТН)
    const order = await this.orderProvider(orderId);
    if (newStatus === OrderStatus.PAID) await this.notifications.sendReceipt(order);
    else await this.notifications.notifyOrderStatus({ ...order, status: newStatus });
  }
}
