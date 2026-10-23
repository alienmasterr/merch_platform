import { describe, expect, it } from 'vitest';
import {
  cleanRecipient,
  EMPTY_RECIPIENT,
  isValidRecipient,
  loadSavedRecipient,
  parcelWeightKg,
  phoneDigits,
  saveRecipient,
  validateRecipient,
} from './recipient';

const valid = {
  fullName: 'Шевченко Тарас',
  phone: '+38 (050) 123-45-67',
  email: 'taras@example.com',
  city: 'Київ',
  warehouse: '12',
};

describe('validateRecipient', () => {
  it('accepts valid details', () => {
    expect(validateRecipient(valid)).toEqual({});
    expect(isValidRecipient(valid)).toBe(true);
  });

  it.each(['0501234567', '380501234567', '+380 50 123 45 67', '050-123-45-67'])(
    'accepts phone %s',
    (phone) => {
      expect(validateRecipient({ ...valid, phone }).phone).toBeUndefined();
    },
  );

  it.each(['12345', '0501234', '+1 202 555 0100', 'телефон'])('rejects phone %s', (phone) => {
    expect(validateRecipient({ ...valid, phone }).phone).toBeDefined();
  });

  it('requires last and first name', () => {
    expect(validateRecipient({ ...valid, fullName: 'Тарас' }).fullName).toBe(
      'Потрібні і прізвище, і імʼя',
    );
    expect(validateRecipient({ ...valid, fullName: '   ' }).fullName).toBe(
      'Вкажіть прізвище та імʼя',
    );
  });

  it('checks email and warehouse number', () => {
    const errors = validateRecipient({ ...valid, email: 'taras@', warehouse: '№12' });
    expect(errors).toEqual({ email: 'Некоректний email', warehouse: 'Лише цифри, наприклад 12' });
  });

  it('reports every missing field', () => {
    expect(Object.keys(validateRecipient(EMPTY_RECIPIENT)).sort()).toEqual([
      'city',
      'email',
      'fullName',
      'phone',
      'warehouse',
    ]);
  });
});

describe('helpers', () => {
  it('strips phone formatting', () => {
    expect(phoneDigits('+38 (050) 123-45-67')).toBe('380501234567');
  });

  it('trims and collapses whitespace', () => {
    expect(
      cleanRecipient({ ...valid, fullName: '  Шевченко   Тарас ', city: ' Київ ' }),
    ).toMatchObject({
      fullName: 'Шевченко Тарас',
      city: 'Київ',
    });
  });

  it('weighs 0.5 kg per item, at least one item', () => {
    expect(parcelWeightKg(3)).toBe(1.5);
    expect(parcelWeightKg(0)).toBe(0.5);
  });

  it('remembers the last recipient', () => {
    expect(loadSavedRecipient()).toEqual(EMPTY_RECIPIENT);
    saveRecipient(valid);
    expect(loadSavedRecipient()).toEqual(valid);
  });
});
