import type { OrderStatus } from '../enums/order-status';
import type { DeliveryRecipient } from './delivery-service';

/** Отримувач замовлення. Сумісний з DeliveryRecipient, але email обовʼязковий (на нього йде чек). */
export interface RecipientDetails extends DeliveryRecipient {
  email: string;
}

/** Позиція замовлення: ціна фіксується на момент створення замовлення. */
export interface OrderItemData {
  customProductId: string;
  quantity: number;
  unitPrice: number;
}

/** Знімок замовлення для збереження, REST і сповіщень (без поведінки). */
export interface OrderData {
  id: string;
  status: OrderStatus;
  items: OrderItemData[];
  recipient: RecipientDetails;
  shippingCost: number;
  ttnNumber: string | null;
  paymentTransactionId: string | null;
  /** ISO 8601 */
  createdAt: string;
}

export interface IOrderRepository {
  save(order: OrderData): Promise<void>;
  findById(id: string): Promise<OrderData | null>;
  findByStatus(status: OrderStatus): Promise<OrderData[]>;
}

/** Вузький інтерфейс керування станом замовлення (ISP). */
export interface IOrderStateOperations {
  getId(): string;
  getStatus(): OrderStatus;
  canTransitionTo(status: OrderStatus): boolean;
  changeStatus(status: OrderStatus): Promise<void>;
}
