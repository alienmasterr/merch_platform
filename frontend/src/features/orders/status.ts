import type { OrderStatus } from '@merch/contracts';
import { STATUS_LABELS } from '../../shared/labels';

/** Звичайний шлях замовлення (CANCELLED може статися до друку). */
export const STATUS_FLOW: OrderStatus[] = [
  'CREATED',
  'PAID',
  'PENDING_REVIEW',
  'PRINTING',
  'SHIPPED',
];

export type StepState = 'done' | 'current' | 'upcoming';

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  state: StepState;
}

export function isFinalStatus(status: OrderStatus | undefined): boolean {
  return status === 'SHIPPED' || status === 'CANCELLED';
}

/** Кроки таймлайну для поточного статусу. Для скасованого всі кроки «upcoming», а скасування окремо. */
export function buildTimeline(status: OrderStatus): TimelineStep[] {
  const index = STATUS_FLOW.indexOf(status);
  return STATUS_FLOW.map((s, i) => ({
    status: s,
    label: STATUS_LABELS[s],
    state:
      index < 0
        ? 'upcoming'
        : i < index
          ? 'done'
          : i === index
            ? s === 'SHIPPED'
              ? 'done'
              : 'current'
            : 'upcoming',
  }));
}

/** Що бачить покупець під таймлайном. */
export function statusHint(status: OrderStatus): string {
  switch (status) {
    case 'CREATED':
      return 'Замовлення чекає на оплату.';
    case 'PAID':
    case 'PENDING_REVIEW':
      return 'Оплату отримано. Менеджер перевіряє макет перед друком.';
    case 'PRINTING':
      return 'Макет схвалено, виріб друкується.';
    case 'SHIPPED':
      return 'Посилку передано Новій Пошті.';
    case 'CANCELLED':
      return 'Замовлення скасовано. Якщо його було оплачено, кошти повернуться на картку.';
  }
}

/** Інтервал опитування статусу: зупиняємось на фінальних статусах. */
export function pollInterval(status: OrderStatus | undefined, ms = 5000): number | false {
  return isFinalStatus(status) ? false : ms;
}

export function trackingUrl(ttn: string): string {
  return `https://novaposhta.ua/tracking/?cargo_number=${encodeURIComponent(ttn)}`;
}
