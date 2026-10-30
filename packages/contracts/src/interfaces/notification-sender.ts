export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  /** Необов'язкова HTML-версія; поштові клієнти без HTML покажуть text. */
  html?: string;
}

export interface INotificationSender {
  send(message: EmailMessage): Promise<void>;
}
