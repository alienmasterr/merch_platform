import { OrderStatus, type OrderData, type RecipientDetails } from '@merch/contracts';

export const recipient: RecipientDetails = {
  fullName: 'Шевченко Тарас',
  phone: '0501234567',
  email: 'taras@example.com',
  city: 'Київ',
  warehouse: '12',
};

export function makeOrderData(overrides: Partial<OrderData> = {}): OrderData {
  return {
    id: 'order-1',
    status: OrderStatus.CREATED,
    items: [{ customProductId: 'p1', quantity: 2, unitPrice: 500 }],
    recipient: { ...recipient, phone: '380501234567' },
    shippingCost: 70,
    ttnNumber: null,
    paymentTransactionId: null,
    createdAt: '2026-10-22T10:00:00.000Z',
    ...overrides,
  };
}
