import { OrderStatus } from '@merch/contracts';

/**
 * Допустимі переходи статусів. Скасувати можна до початку друку;
 * після PRINTING замовлення лише відправляється.
 */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [OrderStatus.CREATED]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PENDING_REVIEW, OrderStatus.CANCELLED],
  [OrderStatus.PENDING_REVIEW]: [OrderStatus.PRINTING, OrderStatus.CANCELLED],
  [OrderStatus.PRINTING]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [],
  [OrderStatus.CANCELLED]: [],
};

/** Статуси, у яких гроші вже списані: скасування потребує повернення коштів. */
export const PAID_STATUSES: ReadonlySet<OrderStatus> = new Set([OrderStatus.PAID, OrderStatus.PENDING_REVIEW]);
