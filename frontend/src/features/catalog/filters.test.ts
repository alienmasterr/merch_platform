import { describe, expect, it } from 'vitest';
import { catalogItems, itemById } from '../../test/fixtures';
import {
  collectOptions,
  filterToParams,
  findVariant,
  groupVariants,
  isFilterEmpty,
  parseFilter,
  sortSizes,
} from './filters';

describe('parseFilter / filterToParams', () => {
  it('reads all supported params', () => {
    const filter = parseFilter(
      new URLSearchParams(
        'categoryId=cat-tshirts&size=M&color=white&minPrice=100&maxPrice=500&inStockOnly=true',
      ),
    );
    expect(filter).toEqual({
      categoryId: 'cat-tshirts',
      size: 'M',
      color: 'white',
      minPrice: 100,
      maxPrice: 500,
      inStockOnly: true,
    });
  });

  it('ignores empty, negative and non-numeric values', () => {
    expect(
      parseFilter(new URLSearchParams('size=&minPrice=abc&maxPrice=-5&inStockOnly=yes')),
    ).toEqual({});
  });

  it('keeps price 0', () => {
    expect(parseFilter(new URLSearchParams('minPrice=0'))).toEqual({ minPrice: 0 });
  });

  it('round-trips through URL params and drops unset values', () => {
    const filter = { color: 'black', maxPrice: 400, inStockOnly: false };
    const params = filterToParams(filter);
    expect(params.toString()).toBe('color=black&maxPrice=400');
    expect(parseFilter(params)).toEqual({ color: 'black', maxPrice: 400 });
  });

  it('detects an empty filter', () => {
    expect(isFilterEmpty({})).toBe(true);
    expect(isFilterEmpty({ inStockOnly: false })).toBe(true);
    expect(isFilterEmpty({ size: 'L' })).toBe(false);
  });
});

describe('sortSizes / collectOptions', () => {
  it('orders sizes naturally and removes duplicates', () => {
    expect(sortSizes(['XL', 'm', 'S', 'ONE', 'M', '42'])).toEqual([
      'S',
      'm',
      'M',
      'XL',
      'ONE',
      '42',
    ]);
  });

  it('collects unique sizes and lower-cased colors', () => {
    expect(collectOptions(catalogItems)).toEqual({
      sizes: ['M', 'L', 'ONE'],
      colors: ['black', 'grey', 'white'],
    });
  });
});

describe('groupVariants', () => {
  it('groups variants of the same product by category and title', () => {
    const groups = groupVariants(catalogItems);
    expect(groups.map((g) => g.title)).toEqual(['Футболка базова', 'Худі оверсайз', 'Чашка']);
    const tee = groups[0];
    expect(tee?.variants).toHaveLength(2);
    expect(tee?.sizes).toEqual(['M', 'L']);
    expect(tee?.colors).toEqual(['white', 'black']);
    expect(tee?.minPrice).toBe(350);
  });

  it('marks groups without stock and still picks a primary variant', () => {
    const hoodie = groupVariants(catalogItems).find((g) => g.title === 'Худі оверсайз');
    expect(hoodie?.inStock).toBe(false);
    expect(hoodie?.primary.id).toBe('hoodie-grey-l');
  });

  it('returns no groups for an empty list', () => {
    expect(groupVariants([])).toEqual([]);
  });
});

describe('findVariant', () => {
  const variants = [itemById('tee-white-m'), itemById('tee-black-l')];

  it('finds exact size and color', () => {
    expect(findVariant(variants, { size: 'L', color: 'BLACK' }, 'size')?.id).toBe('tee-black-l');
  });

  it('keeps the attribute the user just picked', () => {
    // обрали розмір L при білому кольорі: білого L немає, тож беремо чорний L
    expect(findVariant(variants, { size: 'L', color: 'white' }, 'size')?.id).toBe('tee-black-l');
    // обрали білий колір при розмірі L: білого L немає, тож беремо білий M
    expect(findVariant(variants, { size: 'L', color: 'white' }, 'color')?.id).toBe('tee-white-m');
  });

  it('returns undefined when the picked attribute does not exist', () => {
    expect(findVariant(variants, { size: 'XS', color: 'white' }, 'size')).toBeUndefined();
  });
});
