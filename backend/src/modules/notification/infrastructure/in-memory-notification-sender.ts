import type { EmailMessage, INotificationSender } from '@merch/contracts';

/** Для тестів: запамʼятовує надіслані листи. */
export class InMemoryNotificationSender implements INotificationSender {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}
