import type { OrderData } from '../interfaces/order';

export function calculateOrderTotal(order: Pick<OrderData, 'items' | 'shippingCost'>): number {
  const items = order.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  return Math.round((items + order.shippingCost) * 100) / 100;
}
