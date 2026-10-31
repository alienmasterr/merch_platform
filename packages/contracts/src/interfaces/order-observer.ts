import type { OrderStatus } from '../enums/order-status';

export interface IOrderObserver {
  onOrderStatusChanged(orderId: string, newStatus: OrderStatus): void | Promise<void>;
}
