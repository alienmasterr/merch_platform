import type { ApparelItem, CreateApparelItemRequest } from '../../api/types';

export interface ItemForm {
  kind: ApparelItem['kind'];
  title: string;
  basePrice: string;
  size: string;
  color: string;
  fabricComposition: string;
  inStock: boolean;
  categoryId: string;
  hasHood: boolean;
  hasPockets: boolean;
  waistCm: string;
  lengthCm: string;
  accessoryType: string;
}

export const EMPTY_ITEM_FORM: ItemForm = {
  kind: 'TOP',
  title: '',
  basePrice: '',
  size: '',
  color: '',
  fabricComposition: '',
  inStock: true,
  categoryId: '',
  hasHood: false,
  hasPockets: false,
  waistCm: '',
  lengthCm: '',
  accessoryType: '',
};

export type ItemFormErrors = Partial<Record<keyof ItemForm, string>>;

const num = (raw: string) => (raw.trim() === '' ? Number.NaN : Number(raw));

export function buildCreateRequest(
  form: ItemForm,
): { ok: true; request: CreateApparelItemRequest } | { ok: false; errors: ItemFormErrors } {
  const errors: ItemFormErrors = {};
  const price = num(form.basePrice);
  if (!form.title.trim()) errors.title = 'Вкажіть назву';
  if (!Number.isFinite(price) || price < 0) errors.basePrice = 'Ціна має бути числом ≥ 0';
  if (!form.size.trim()) errors.size = 'Вкажіть розмір';
  if (!form.color.trim()) errors.color = 'Вкажіть колір';
  if (!form.categoryId) errors.categoryId = 'Оберіть категорію';

  const waist = num(form.waistCm);
  const length = num(form.lengthCm);
  if (form.kind === 'BOTTOM') {
    if (!(waist > 0)) errors.waistCm = 'Додатне число';
    if (!(length > 0)) errors.lengthCm = 'Додатне число';
  }
  if (form.kind === 'ACCESSORY' && !form.accessoryType.trim())
    errors.accessoryType = 'Вкажіть тип аксесуара';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const common = {
    kind: form.kind,
    title: form.title.trim(),
    basePrice: price,
    size: form.size.trim(),
    color: form.color.trim().toLowerCase(),
    fabricComposition: form.fabricComposition.trim(),
    inStock: form.inStock,
    categoryId: form.categoryId,
  };
  const extra =
    form.kind === 'TOP'
      ? { hasHood: form.hasHood, hasPockets: form.hasPockets }
      : form.kind === 'BOTTOM'
        ? { waistCm: waist, lengthCm: length }
        : { accessoryType: form.accessoryType.trim() };
  return { ok: true, request: { ...common, ...extra } };
}

export function parsePrice(raw: string): number | null {
  const value = num(raw.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
}
