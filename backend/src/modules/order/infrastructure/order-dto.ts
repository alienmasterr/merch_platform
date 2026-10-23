import { calculateOrderTotal, type OrderData } from '@merch/contracts';
import { ORDER_TRANSITIONS } from '../domain/order-transitions';

export function orderToDto(order: OrderData) {
  return {
    id: order.id,
    status: order.status,
    allowedNextStatuses: [...ORDER_TRANSITIONS[order.status]],
    items: order.items.map((i) => ({
      customProductId: i.customProductId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: Math.round(i.unitPrice * i.quantity * 100) / 100,
    })),
    recipient: order.recipient,
    shippingCost: order.shippingCost,
    total: calculateOrderTotal(order),
    currency: 'UAH' as const,
    ttnNumber: order.ttnNumber,
    paymentTransactionId: order.paymentTransactionId,
    createdAt: order.createdAt,
  };
}
