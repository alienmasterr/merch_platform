import type { INotificationSender } from '@merch/contracts';
import { EmailNotificationObserver, type OrderProvider } from './application/email-notification-observer';
import { NotificationService, type ItemDescriber, type OrderUrlBuilder } from './application/notification-service';

export interface NotificationModuleDeps {
  sender: INotificationSender;
  orderProvider: OrderProvider;
  describeItem?: ItemDescriber;
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
