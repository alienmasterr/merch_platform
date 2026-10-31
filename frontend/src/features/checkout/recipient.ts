import type { RecipientDetails } from '../../api/types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UA_PHONE_DIGITS = /^(38)?0\d{9}$/;

export type RecipientErrors = Partial<Record<keyof RecipientDetails, string>>;

export const EMPTY_RECIPIENT: RecipientDetails = {
  fullName: '',
  phone: '',
  email: '',
  city: '',
  warehouse: '',
};

export function phoneDigits(phone: string): string {
  return phone.replace(/[\s()+-]/g, '');
}

export function validateRecipient(r: RecipientDetails): RecipientErrors {
  const errors: RecipientErrors = {};
  const name = r.fullName.trim().replace(/\s+/g, ' ');
  if (!name) errors.fullName = 'Вкажіть прізвище та імʼя';
  else if (name.split(' ').length < 2) errors.fullName = 'Потрібні і прізвище, і імʼя';

  if (!r.phone.trim()) errors.phone = 'Вкажіть телефон';
  else if (!UA_PHONE_DIGITS.test(phoneDigits(r.phone)))
    errors.phone = 'Український номер, наприклад 0501234567';

  if (!r.email.trim()) errors.email = 'Вкажіть email';
  else if (!EMAIL.test(r.email.trim())) errors.email = 'Некоректний email';

  if (!r.city.trim()) errors.city = 'Вкажіть місто';

  if (!r.warehouse.trim()) errors.warehouse = 'Вкажіть номер відділення';
  else if (!/^\d+$/.test(r.warehouse.trim())) errors.warehouse = 'Лише цифри, наприклад 12';

  return errors;
}

export function isValidRecipient(r: RecipientDetails): boolean {
  return Object.keys(validateRecipient(r)).length === 0;
}

export function cleanRecipient(r: RecipientDetails): RecipientDetails {
  return {
    fullName: r.fullName.trim().replace(/\s+/g, ' '),
    phone: r.phone.trim(),
    email: r.email.trim(),
    city: r.city.trim(),
    warehouse: r.warehouse.trim(),
  };
}

export const WEIGHT_PER_ITEM_KG = 0.5;

export function parcelWeightKg(itemCount: number): number {
  return Math.max(1, itemCount) * WEIGHT_PER_ITEM_KG;
}

const RECIPIENT_STORAGE_KEY = 'merch.recipient.v1';

export function loadSavedRecipient(): RecipientDetails {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RECIPIENT_STORAGE_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return EMPTY_RECIPIENT;
    const value = raw as Record<string, unknown>;
    const text = (key: keyof RecipientDetails) =>
      typeof value[key] === 'string' ? (value[key] as string) : '';
    return {
      fullName: text('fullName'),
      phone: text('phone'),
      email: text('email'),
      city: text('city'),
      warehouse: text('warehouse'),
    };
  } catch {
    return EMPTY_RECIPIENT;
  }
}

export function saveRecipient(r: RecipientDetails): void {
  try {
    localStorage.setItem(RECIPIENT_STORAGE_KEY, JSON.stringify(r));
  } catch {
  }
}
