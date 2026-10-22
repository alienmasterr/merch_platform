import type { INotificationSender, OrderData } from '@merch/contracts';
import { OrderReceiptMessage, OrderStatusUpdateMessage } from '../domain/message-template';

export class NotificationService {
  private readonly sender: INotificationSender;

  constructor(sender: INotificationSender) {
    this.sender = sender;
  }

  notifyOrderStatus(order: OrderData): Promise<void> {
    return this.sender.send(new OrderStatusUpdateMessage(order).render());
  }

  sendReceipt(order: OrderData): Promise<void> {
    return this.sender.send(new OrderReceiptMessage(order).render());
  }
}
