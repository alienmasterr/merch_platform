import type { OrderStatus, PrintPlacement, PrintTechnology } from '@merch/contracts';
import type { ApparelItem } from '../api/types';

export const PLACEMENT_LABELS: Record<PrintPlacement, string> = {
  CHEST: 'Груди',
  BACK: 'Спина',
  SLEEVE: 'Рукав',
  LEFT_LEG: 'Ліва штанина',
  RIGHT_LEG: 'Права штанина',
  ACCESSORY_FRONT: 'Лицьова сторона',
};

export const TECHNOLOGY_LABELS: Record<PrintTechnology, string> = {
  DTG: 'DTG (прямий друк)',
  DTF: 'DTF (термоплівка)',
  EMBROIDERY: 'Вишивка',
  SUBLIMATION: 'Сублімація',
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: 'Створено',
  PAID: 'Оплачено',
  PENDING_REVIEW: 'Перевірка макета',
  PRINTING: 'У друці',
  SHIPPED: 'Відправлено',
  CANCELLED: 'Скасовано',
};

export const KIND_LABELS: Record<ApparelItem['kind'], string> = {
  TOP: 'Верхній одяг',
  BOTTOM: 'Низ',
  ACCESSORY: 'Аксесуар',
};
