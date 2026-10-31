export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface INotificationSender {
  send(message: EmailMessage): Promise<void>;
}
