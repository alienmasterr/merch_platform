import type { OrderStatus } from '../enums/order-status';
import type { DeliveryRecipient } from './delivery-service';

export interface RecipientDetails extends DeliveryRecipient {
  email: string;
}

export interface OrderItemData {
  customProductId: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderData {
  id: string;
  status: OrderStatus;
  items: OrderItemData[];
  recipient: RecipientDetails;
  shippingCost: number;
  ttnNumber: string | null;
  paymentTransactionId: string | null;
  createdAt: string;
}

export interface IOrderRepository {
  save(order: OrderData): Promise<void>;
  findById(id: string): Promise<OrderData | null>;
  findByStatus(status: OrderStatus): Promise<OrderData[]>;
}

export interface IOrderStateOperations {
  getId(): string;
  getStatus(): OrderStatus;
  canTransitionTo(status: OrderStatus): boolean;
  changeStatus(status: OrderStatus): Promise<void>;
}
