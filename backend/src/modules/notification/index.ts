import type { INotificationSender } from '@merch/contracts';
import { EmailNotificationObserver, type OrderProvider } from './application/email-notification-observer';
import { NotificationService } from './application/notification-service';

export interface NotificationModuleDeps {
  sender: INotificationSender;
  /** Як дістати актуальне замовлення за id (у composition root це order-модуль). */
  orderProvider: OrderProvider;
}

export function createNotificationModule(deps: NotificationModuleDeps) {
  const service = new NotificationService(deps.sender);
  const observer = new EmailNotificationObserver(service, deps.orderProvider);
  return { service, observer };
}
