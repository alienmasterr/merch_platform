import type { OrderStatus } from '@merch/contracts';
import type { Order } from '../../api/types';

export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING_REVIEW',
  'PRINTING',
  'CREATED',
  'PAID',
  'SHIPPED',
  'CANCELLED',
];

export const managerOrdersKey = (status: OrderStatus) => ['manager', 'orders', status] as const;

export function manualTransitions(order: Pick<Order, 'allowedNextStatuses'>): OrderStatus[] {
  return order.allowedNextStatuses.filter((s) => s === 'SHIPPED' || s === 'CANCELLED');
}

export function canReviewMockup(order: Pick<Order, 'status'>): boolean {
  return order.status === 'PENDING_REVIEW';
}

export function cancelRefunds(order: Pick<Order, 'status'>): boolean {
  return order.status === 'PAID' || order.status === 'PENDING_REVIEW';
}
