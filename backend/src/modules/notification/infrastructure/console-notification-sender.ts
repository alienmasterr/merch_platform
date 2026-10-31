import type { EmailMessage, INotificationSender } from '@merch/contracts';

export class ConsoleNotificationSender implements INotificationSender {
  private readonly log: (line: string) => void;

  constructor(log: (line: string) => void = console.log) {
    this.log = log;
  }

  async send(message: EmailMessage): Promise<void> {
    this.log(`[email] to=${message.to} subject="${message.subject}"\n${message.text}`);
  }
}
