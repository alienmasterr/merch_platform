export const OrderStatus = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  PENDING_REVIEW: 'PENDING_REVIEW',
  PRINTING: 'PRINTING',
  SHIPPED: 'SHIPPED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
