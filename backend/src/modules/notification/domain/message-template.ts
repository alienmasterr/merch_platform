import { calculateOrderTotal, OrderStatus, type EmailMessage, type OrderData } from '@merch/contracts';

const formatUah = (n: number): string => `${n.toFixed(2)} грн`;

/** Template Method: спільна рамка листа, нащадки задають тему й основний текст. */
export abstract class MessageTemplate {
  protected readonly order: OrderData;

  constructor(order: OrderData) {
    this.order = order;
  }

  protected abstract getSubject(): string;
  protected abstract getBody(): string;

  render(): EmailMessage {
    const greeting = `Вітаємо, ${this.order.recipient.fullName}!`;
    const footer = 'Дякуємо, що обрали Merch Platform.';
    return {
      to: this.order.recipient.email,
      subject: this.getSubject(),
      text: [greeting, '', this.getBody(), '', footer].join('\n'),
    };
  }

  protected formatTotal(): string {
    return formatUah(calculateOrderTotal(this.order));
  }
}

export class OrderReceiptMessage extends MessageTemplate {
  protected getSubject(): string {
    return `Чек за замовлення ${this.order.id}`;
  }

  protected getBody(): string {
    const items = this.order.items.map(
      (i, n) => `${n + 1}. Виріб ${i.customProductId} × ${i.quantity}: ${formatUah(i.unitPrice * i.quantity)}`,
    );
    const lines = [
      'Оплату отримано. Макет передано менеджеру на перевірку.',
      '',
      ...items,
      `Доставка: ${formatUah(this.order.shippingCost)}`,
      `Разом: ${this.formatTotal()}`,
    ];
    if (this.order.paymentTransactionId) lines.push(`Номер транзакції: ${this.order.paymentTransactionId}`);
    return lines.join('\n');
  }
}

const STATUS_TEXT: Record<OrderStatus, string> = {
  [OrderStatus.CREATED]: 'Замовлення створено й очікує оплати.',
  [OrderStatus.PAID]: 'Замовлення оплачено.',
  [OrderStatus.PENDING_REVIEW]: 'Макет на перевірці в менеджера.',
  [OrderStatus.PRINTING]: 'Макет затверджено, замовлення передано в друк.',
  [OrderStatus.SHIPPED]: 'Замовлення відправлено Новою Поштою.',
  [OrderStatus.CANCELLED]: 'Замовлення скасовано. Якщо його було оплачено, кошти повернуто на картку.',
};

export class OrderStatusUpdateMessage extends MessageTemplate {
  protected getSubject(): string {
    return `Замовлення ${this.order.id}: новий статус`;
  }

  protected getBody(): string {
    const lines = [STATUS_TEXT[this.order.status]];
    if (this.order.status === OrderStatus.SHIPPED) {
      lines.push(
        this.order.ttnNumber
          ? `Номер ТТН: ${this.order.ttnNumber}. Відділення №${this.order.recipient.warehouse}, ${this.order.recipient.city}.`
          : 'Номер ТТН надішлемо окремо.',
      );
    }
    return lines.join('\n');
  }
}
