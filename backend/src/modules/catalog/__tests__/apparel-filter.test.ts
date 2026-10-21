import { describe, expect, it } from 'vitest';
import { ApparelFilter } from '@merch/contracts';
import { makeTee } from '../../../test-utils/fixtures';

describe('ApparelFilter.matches', () => {
  const tee = makeTee({ basePrice: 300, size: 'M', color: 'White' });

  it('порожній фільтр пропускає все', () => {
    expect(new ApparelFilter().matches(tee)).toBe(true);
  });

  it('розмір і колір порівнюються без урахування регістру', () => {
    expect(new ApparelFilter({ size: 'm', color: 'white' }).matches(tee)).toBe(true);
  });

  it('діапазон цін включає межі', () => {
    expect(new ApparelFilter({ minPrice: 300, maxPrice: 300 }).matches(tee)).toBe(true);
    expect(new ApparelFilter({ minPrice: 301 }).matches(tee)).toBe(false);
    expect(new ApparelFilter({ maxPrice: 299 }).matches(tee)).toBe(false);
  });

  it('категорія: збіг і незбіг', () => {
    expect(new ApparelFilter({ categoryId: 'cat-tees' }).matches(tee)).toBe(true);
    expect(new ApparelFilter({ categoryId: 'other' }).matches(tee)).toBe(false);
  });

  it('inStockOnly відсікає відсутні товари', () => {
    const out = makeTee({ inStock: false });
    expect(new ApparelFilter({ inStockOnly: true }).matches(out)).toBe(false);
    expect(new ApparelFilter({ inStockOnly: false }).matches(out)).toBe(true);
  });
});
