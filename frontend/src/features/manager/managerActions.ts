import type { OrderStatus } from '@merch/contracts';
import type { Order } from '../../api/types';

/** Вкладки панелі: спершу ті, що потребують дії менеджера. */
export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING_REVIEW',
  'PRINTING',
  'CREATED',
  'PAID',
  'SHIPPED',
  'CANCELLED',
];

export const managerOrdersKey = (status: OrderStatus) => ['manager', 'orders', status] as const;

/**
 * Статуси, які менеджер ставить вручну. PAID і PENDING_REVIEW ставить лише webhook оплати,
 * PRINTING лише схвалення макета (бекенд відповість 409 на спробу задати їх напряму).
 */
export function manualTransitions(order: Pick<Order, 'allowedNextStatuses'>): OrderStatus[] {
  return order.allowedNextStatuses.filter((s) => s === 'SHIPPED' || s === 'CANCELLED');
}

export function canReviewMockup(order: Pick<Order, 'status'>): boolean {
  return order.status === 'PENDING_REVIEW';
}

/** Чи повернуться гроші при скасуванні (замовлення вже оплачене). */
export function cancelRefunds(order: Pick<Order, 'status'>): boolean {
  return order.status === 'PAID' || order.status === 'PENDING_REVIEW';
}
