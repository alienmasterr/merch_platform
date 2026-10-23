import { describe, expect, it } from 'vitest';
import { buildCreateRequest, EMPTY_ITEM_FORM, parsePrice, type ItemForm } from './itemForm';

const base: ItemForm = {
  ...EMPTY_ITEM_FORM,
  title: ' Лонгслів ',
  basePrice: '450',
  size: 'XL',
  color: 'Navy',
  categoryId: 'cat-tshirts',
};

describe('buildCreateRequest', () => {
  it('builds a TOP item with hood/pockets flags', () => {
    expect(buildCreateRequest({ ...base, hasHood: true })).toEqual({
      ok: true,
      request: {
        kind: 'TOP',
        title: 'Лонгслів',
        basePrice: 450,
        size: 'XL',
        color: 'navy',
        fabricComposition: '',
        inStock: true,
        categoryId: 'cat-tshirts',
        hasHood: true,
        hasPockets: false,
      },
    });
  });

  it('requires waist and length for BOTTOM', () => {
    const result = buildCreateRequest({ ...base, kind: 'BOTTOM', waistCm: '0', lengthCm: '' });
    expect(result).toEqual({
      ok: false,
      errors: { waistCm: 'Додатне число', lengthCm: 'Додатне число' },
    });
    const ok = buildCreateRequest({ ...base, kind: 'BOTTOM', waistCm: '80', lengthCm: '100' });
    expect(ok).toMatchObject({ ok: true, request: { waistCm: 80, lengthCm: 100 } });
    expect(ok.ok && 'hasHood' in ok.request).toBe(false);
  });

  it('requires accessory type for ACCESSORY', () => {
    expect(buildCreateRequest({ ...base, kind: 'ACCESSORY' })).toMatchObject({
      ok: false,
      errors: { accessoryType: 'Вкажіть тип аксесуара' },
    });
    expect(buildCreateRequest({ ...base, kind: 'ACCESSORY', accessoryType: 'cap' })).toMatchObject({
      ok: true,
      request: { accessoryType: 'cap' },
    });
  });

  it('reports all missing common fields', () => {
    const result = buildCreateRequest(EMPTY_ITEM_FORM);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(Object.keys(result.errors).sort()).toEqual([
        'basePrice',
        'categoryId',
        'color',
        'size',
        'title',
      ]);
  });

  it('rejects a negative price', () => {
    expect(buildCreateRequest({ ...base, basePrice: '-1' })).toMatchObject({
      ok: false,
      errors: { basePrice: expect.any(String) },
    });
  });
});

describe('parsePrice', () => {
  it('accepts numbers with dot or comma', () => {
    expect(parsePrice('399')).toBe(399);
    expect(parsePrice('399,5')).toBe(399.5);
    expect(parsePrice('0')).toBe(0);
  });

  it('rejects empty, negative and text', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('-5')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
  });
});
