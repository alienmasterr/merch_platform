import type { EmailMessage, INotificationSender } from '@merch/contracts';

export class InMemoryNotificationSender implements INotificationSender {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}
