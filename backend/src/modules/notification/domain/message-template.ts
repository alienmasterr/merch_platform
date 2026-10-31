import { calculateOrderTotal, OrderStatus, type EmailMessage, type OrderData } from '@merch/contracts';
import {
  amountTable,
  badge,
  button,
  escapeHtml,
  infoBox,
  paragraph,
  renderEmailLayout,
  type BadgeTone,
} from './email-layout';

const formatUah = (n: number): string => `${n.toFixed(2)} грн`;

export type ItemNames = Readonly<Record<string, string>>;

export interface TemplateOptions {
  itemNames?: ItemNames;
  orderUrl?: string;
}

export abstract class MessageTemplate {
  protected readonly order: OrderData;
  protected readonly options: TemplateOptions;

  constructor(order: OrderData, options: TemplateOptions = {}) {
    this.order = order;
    this.options = options;
  }

  protected abstract getSubject(): string;
  protected abstract getHeading(): string;
  protected abstract getBody(): string;
  protected abstract getHtmlBody(): string;

  render(): EmailMessage {
    const greeting = `Вітаємо, ${this.order.recipient.fullName}!`;
    const footer = 'Дякуємо, що обрали Merch Platform.';
    const subject = this.getSubject();
    const link = this.options.orderUrl ? `\nЗамовлення: ${this.options.orderUrl}` : '';
    const html = renderEmailLayout({
      title: subject,
      preheader: this.getBody().split('\n')[0] ?? subject,
      heading: this.getHeading(),
      bodyHtml:
        paragraph(`Вітаємо, ${escapeHtml(this.order.recipient.fullName)}!`) +
        this.getHtmlBody() +
        (this.options.orderUrl ? button('Переглянути замовлення', this.options.orderUrl) : ''),
    });
    return {
      to: this.order.recipient.email,
      subject,
      text: [greeting, '', this.getBody() + link, '', footer].join('\n'),
      html,
    };
  }

  protected formatTotal(): string {
    return formatUah(calculateOrderTotal(this.order));
  }

  protected orderNumberHtml(): string {
    return paragraph(`Замовлення № <span style="font-family:monospace;">${escapeHtml(this.order.id)}</span>`, true);
  }

  protected deliveryAddress(): string {
    return `Нова Пошта, ${this.order.recipient.city}, відділення №${this.order.recipient.warehouse}`;
  }
}

export class OrderReceiptMessage extends MessageTemplate {
  protected getSubject(): string {
    return `Чек за замовлення ${this.order.id}`;
  }

  protected getHeading(): string {
    return 'Дякуємо за оплату!';
  }

  private itemName(customProductId: string): string {
    return this.options.itemNames?.[customProductId] ?? `Виріб ${customProductId}`;
  }

  protected getBody(): string {
    const items = this.order.items.map(
      (i, n) =>
        `${n + 1}. ${this.itemName(i.customProductId)} × ${i.quantity}: ${formatUah(i.unitPrice * i.quantity)}`,
    );
    const lines = [
      'Оплату отримано. Макет передано менеджеру на перевірку.',
      '',
      ...items,
      `Доставка: ${formatUah(this.order.shippingCost)}`,
      `Разом: ${this.formatTotal()}`,
      '',
      `Адреса доставки: ${this.deliveryAddress()}.`,
    ];
    if (this.order.paymentTransactionId) lines.push(`Номер транзакції: ${this.order.paymentTransactionId}`);
    return lines.join('\n');
  }

  protected getHtmlBody(): string {
    const { recipient } = this.order;
    const rows = [
      ...this.order.items.map((i) => ({
        label: `${this.itemName(i.customProductId)} × ${i.quantity}`,
        value: formatUah(i.unitPrice * i.quantity),
      })),
      { label: 'Доставка Новою Поштою', value: formatUah(this.order.shippingCost), muted: true },
      { label: 'Разом', value: this.formatTotal(), total: true },
    ];
    const transaction = this.order.paymentTransactionId
      ? paragraph(`Номер транзакції: ${escapeHtml(this.order.paymentTransactionId)}`, true)
      : '';
    return (
      paragraph(badge('Оплачено', 'success')) +
      paragraph('Оплату отримано. Макет передано менеджеру на перевірку, після схвалення виріб піде в друк.') +
      this.orderNumberHtml() +
      amountTable(rows) +
      infoBox(
        'Доставка',
        `${escapeHtml(recipient.fullName)}, ${escapeHtml(recipient.phone)}<br>${escapeHtml(this.deliveryAddress())}`,
      ) +
      transaction
    );
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

const STATUS_BADGE: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  [OrderStatus.CREATED]: { label: 'Створено', tone: 'info' },
  [OrderStatus.PAID]: { label: 'Оплачено', tone: 'success' },
  [OrderStatus.PENDING_REVIEW]: { label: 'Перевірка макета', tone: 'warning' },
  [OrderStatus.PRINTING]: { label: 'У друці', tone: 'info' },
  [OrderStatus.SHIPPED]: { label: 'Відправлено', tone: 'success' },
  [OrderStatus.CANCELLED]: { label: 'Скасовано', tone: 'danger' },
};

const trackingUrl = (ttn: string): string =>
  `https://novaposhta.ua/tracking/?cargo_number=${encodeURIComponent(ttn)}`;

export class OrderStatusUpdateMessage extends MessageTemplate {
  protected getSubject(): string {
    return `Замовлення ${this.order.id}: новий статус`;
  }

  protected getHeading(): string {
    return 'Статус замовлення змінився';
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

  protected getHtmlBody(): string {
    const { label, tone } = STATUS_BADGE[this.order.status];
    let shipping = '';
    if (this.order.status === OrderStatus.SHIPPED) {
      const ttn = this.order.ttnNumber;
      shipping = ttn
        ? infoBox(
            'ТТН Нової Пошти',
            `<span style="font-size:18px;font-weight:700;font-family:monospace;">${escapeHtml(ttn)}</span><br>` +
              `${escapeHtml(this.deliveryAddress())}<br>` +
              `<a href="${escapeHtml(trackingUrl(ttn))}" style="color:#4f46e5;">Відстежити посилку</a>`,
          )
        : paragraph('Номер ТТН надішлемо окремо.', true);
    }
    return (
      paragraph(badge(label, tone)) +
      paragraph(escapeHtml(STATUS_TEXT[this.order.status])) +
      this.orderNumberHtml() +
      shipping
    );
  }
}
