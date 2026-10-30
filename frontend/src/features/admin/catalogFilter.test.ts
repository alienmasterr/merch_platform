import { describe, expect, it } from 'vitest';
import type { Category } from '../../api/types';
import { catalogItems, categories } from '../../test/fixtures';
import {
  categoriesForKind,
  EMPTY_ADMIN_FILTER,
  filterAdminItems,
  isAdminFilterEmpty,
} from './catalogFilter';

const ids = (items: { id: string }[]) => items.map((i) => i.id);
const newCategory: Category = { id: 'cat-new', name: 'Новинки', slug: 'new' };

describe('categoriesForKind', () => {
  it('offers only categories that hold items of the chosen kind', () => {
    expect(ids(categoriesForKind('TOP', categories, catalogItems))).toEqual([
      'cat-tshirts',
      'cat-hoodies',
    ]);
    expect(ids(categoriesForKind('ACCESSORY', categories, catalogItems))).toEqual([
      'cat-accessories',
    ]);
  });

  it('offers an empty category for any kind', () => {
    const all = [...categories, newCategory];
    expect(ids(categoriesForKind('BOTTOM', all, catalogItems))).toEqual(['cat-new']);
  });

  it('returns everything when no kind is chosen', () => {
    expect(categoriesForKind('', categories, catalogItems)).toBe(categories);
  });
});

describe('filterAdminItems', () => {
  it('returns all items for an empty filter', () => {
    expect(filterAdminItems(catalogItems, EMPTY_ADMIN_FILTER)).toHaveLength(catalogItems.length);
    expect(isAdminFilterEmpty(EMPTY_ADMIN_FILTER)).toBe(true);
  });

  it('searches title, id, colour and size, all words must match', () => {
    const q = (query: string) =>
      ids(filterAdminItems(catalogItems, { ...EMPTY_ADMIN_FILTER, query }));
    expect(q('футболка')).toEqual(['tee-white-m', 'tee-black-l']);
    expect(q('Футболка black')).toEqual(['tee-black-l']);
    expect(q('mug')).toEqual(['mug-white']);
    expect(q('немає')).toEqual([]);
  });

  it('filters by kind, category and stock', () => {
    const f = (patch: Partial<typeof EMPTY_ADMIN_FILTER>) =>
      ids(filterAdminItems(catalogItems, { ...EMPTY_ADMIN_FILTER, ...patch }));
    expect(f({ kind: 'ACCESSORY' })).toEqual(['mug-white']);
    expect(f({ categoryId: 'cat-hoodies' })).toEqual(['hoodie-grey-l']);
    expect(f({ stock: 'out' })).toEqual(['hoodie-grey-l']);
    expect(f({ kind: 'TOP', stock: 'in' })).toEqual(['tee-white-m', 'tee-black-l']);
    expect(isAdminFilterEmpty({ ...EMPTY_ADMIN_FILTER, stock: 'in' })).toBe(false);
  });
});
