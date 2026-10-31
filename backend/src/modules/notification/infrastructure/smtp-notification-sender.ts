import { ExternalServiceError, type EmailMessage, type INotificationSender } from '@merch/contracts';

export interface MailTransport {
  sendMail(mail: { from: string; to: string; subject: string; text: string; html?: string }): Promise<unknown>;
}

export class SmtpNotificationSender implements INotificationSender {
  private readonly transport: MailTransport;
  private readonly from: string;

  constructor(transport: MailTransport, from: string) {
    this.transport = transport;
    this.from = from;
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transport.sendMail({ from: this.from, ...message });
    } catch (cause) {
      throw new ExternalServiceError(`SMTP send to ${message.to} failed: ${String(cause)}`);
    }
  }
}
