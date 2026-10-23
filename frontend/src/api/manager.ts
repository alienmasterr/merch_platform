import type { OrderStatus } from '@merch/contracts';
import { api, unwrap } from './client';
import type { Order, OrderActionResult } from './types';

// Значення заголовка підставляє middleware із поточної ролі (див. client.ts)
const header = { 'x-user-role': 'manager' } as const;

export function listOrdersByStatus(status: OrderStatus): Promise<Order[]> {
  return unwrap(api.GET('/manager/orders', { params: { header, query: { status } } }));
}

/** Схвалити макет (→ PRINTING) або відхилити (повернення коштів → CANCELLED). */
export function verifyMockup(id: string, approved: boolean): Promise<OrderActionResult> {
  return unwrap(
    api.POST('/manager/orders/{id}/verify-mockup', {
      params: { header, path: { id } },
      body: { approved },
    }),
  );
}

/** Ручна зміна статусу: SHIPPED (створює ТТН) або CANCELLED. */
export function changeOrderStatus(id: string, status: OrderStatus): Promise<OrderActionResult> {
  return unwrap(
    api.PATCH('/manager/orders/{id}/status', {
      params: { header, path: { id } },
      body: { status },
    }),
  );
}

/** Повторити сповіщення спостерігачів (ТТН, email), якщо дія повернула warnings. */
export function retryNotifications(id: string): Promise<OrderActionResult> {
  return unwrap(api.POST('/manager/orders/{id}/notify', { params: { header, path: { id } } }));
}
