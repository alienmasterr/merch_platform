import type { INotificationSender } from '@merch/contracts';
import { EmailNotificationObserver, type OrderProvider } from './application/email-notification-observer';
import { NotificationService, type ItemDescriber, type OrderUrlBuilder } from './application/notification-service';

export interface NotificationModuleDeps {
  sender: INotificationSender;
  /** Як дістати актуальне замовлення за id (у composition root це order-модуль). */
  orderProvider: OrderProvider;
  /** Опційно: назви виробів для чека (у composition root це customizer-репозиторій). */
  describeItem?: ItemDescriber;
  /** Опційно: посилання на сторінку замовлення в SPA (кнопка в листах). */
  orderUrl?: OrderUrlBuilder;
}

export function createNotificationModule(deps: NotificationModuleDeps) {
  const service = new NotificationService(deps.sender, {
    ...(deps.describeItem && { describeItem: deps.describeItem }),
    ...(deps.orderUrl && { orderUrl: deps.orderUrl }),
  });
  const observer = new EmailNotificationObserver(service, deps.orderProvider);
  return { service, observer };
}
