import {
  calculateOrderTotal,
  ConflictError,
  ExternalServiceError,
  OrderStatus,
  ValidationError,
  type IOrderObserver,
  type IOrderStateOperations,
  type OrderData,
  type OrderItemData,
  type RecipientDetails,
} from '@merch/contracts';
import { ORDER_TRANSITIONS } from './order-transitions';
import { createRecipientDetails } from './recipient-details';

export interface NewOrderProps {
  id: string;
  items: OrderItemData[];
  recipient: RecipientDetails;
  shippingCost: number;
  createdAt: Date;
}

/** Помилки спостерігачів після зміни статусу: сам статус уже змінено, тому це 502, а не відкат. */
export class ObserverNotificationError extends ExternalServiceError {
  readonly failures: Error[];

  constructor(failures: Error[]) {
    super(`Order observers failed: ${failures.map((f) => f.message).join('; ')}`);
    this.failures = failures;
  }
}

const toError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));

/** Замовлення: суб'єкт Observer і кінцевий автомат статусів. */
export class Order implements IOrderStateOperations {
  private readonly data: OrderData;
  private readonly observers: IOrderObserver[] = [];

  private constructor(data: OrderData) {
    this.data = data;
  }

  static create(props: NewOrderProps): Order {
    if (props.items.length === 0) throw new ValidationError('Order must contain at least one item');
    for (const item of props.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new ValidationError('Item quantity must be a positive integer');
      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) throw new ValidationError('Item price must be a non-negative number');
    }
    if (!Number.isFinite(props.shippingCost) || props.shippingCost < 0) throw new ValidationError('Shipping cost must be non-negative');

    return new Order({
      id: props.id,
      status: OrderStatus.CREATED,
      items: props.items.map((i) => ({ ...i })),
      recipient: createRecipientDetails(props.recipient),
      shippingCost: props.shippingCost,
      ttnNumber: null,
      paymentTransactionId: null,
      createdAt: props.createdAt.toISOString(),
    });
  }

  /** Відновлення зі сховища (дані вже були провалідовані під час створення). */
  static fromData(data: OrderData): Order {
    return new Order(structuredClone(data));
  }

  toData(): OrderData {
    return structuredClone(this.data);
  }

  getId(): string {
    return this.data.id;
  }

  getStatus(): OrderStatus {
    return this.data.status;
  }

  getRecipient(): RecipientDetails {
    return { ...this.data.recipient };
  }

  calculateTotal(): number {
    return calculateOrderTotal(this.data);
  }

  setTtnNumber(ttn: string): void {
    if (!ttn.trim()) throw new ValidationError('TTN number must not be empty');
    this.data.ttnNumber = ttn;
  }

  setPaymentTransactionId(id: string | null): void {
    this.data.paymentTransactionId = id;
  }

  // ---- Observer ----
  attach(observer: IOrderObserver): void {
    if (!this.observers.includes(observer)) this.observers.push(observer);
  }

  detach(observer: IOrderObserver): void {
    const i = this.observers.indexOf(observer);
    if (i >= 0) this.observers.splice(i, 1);
  }

  /**
   * Сповіщає спостерігачів по черзі (порядок attach важливий: доставка дописує ТТН до листа).
   * Помилка одного не зупиняє інших; наприкінці всі помилки кидаються разом.
   */
  async notifyObservers(): Promise<void> {
    const failures: Error[] = [];
    for (const observer of [...this.observers]) {
      try {
        await observer.onOrderStatusChanged(this.data.id, this.data.status);
      } catch (e) {
        failures.push(toError(e));
      }
    }
    if (failures.length) throw new ObserverNotificationError(failures);
  }

  // ---- стан ----
  canTransitionTo(status: OrderStatus): boolean {
    return ORDER_TRANSITIONS[this.data.status].includes(status);
  }

  getAllowedTransitions(): OrderStatus[] {
    return [...ORDER_TRANSITIONS[this.data.status]];
  }

  /** Лише змінює статус (без сповіщень). Сервіс спершу зберігає замовлення, потім сповіщає. */
  transitionTo(status: OrderStatus): void {
    if (!this.canTransitionTo(status)) {
      throw new ConflictError(`Order ${this.data.id} cannot move from ${this.data.status} to ${status}`);
    }
    this.data.status = status;
  }

  async changeStatus(status: OrderStatus): Promise<void> {
    this.transitionTo(status);
    await this.notifyObservers();
  }
}
