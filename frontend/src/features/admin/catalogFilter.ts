import type { ApparelItem, Category } from '../../api/types';

export type Kind = ApparelItem['kind'];
export type StockFilter = 'all' | 'in' | 'out';

export interface AdminFilter {
  query: string;
  kind: Kind | '';
  categoryId: string;
  stock: StockFilter;
}

export const EMPTY_ADMIN_FILTER: AdminFilter = {
  query: '',
  kind: '',
  categoryId: '',
  stock: 'all',
};

export function isAdminFilterEmpty(filter: AdminFilter): boolean {
  return !filter.query.trim() && !filter.kind && !filter.categoryId && filter.stock === 'all';
}

export function categoriesForKind(
  kind: Kind | '',
  categories: Category[],
  items: ApparelItem[],
): Category[] {
  if (!kind) return categories;
  const kindsByCategory = new Map<string, Set<Kind>>();
  for (const item of items) {
    const kinds = kindsByCategory.get(item.category.id) ?? new Set<Kind>();
    kinds.add(item.kind);
    kindsByCategory.set(item.category.id, kinds);
  }
  return categories.filter((c) => {
    const kinds = kindsByCategory.get(c.id);
    return !kinds || kinds.has(kind);
  });
}

export function filterAdminItems(items: ApparelItem[], filter: AdminFilter): ApparelItem[] {
  const words = filter.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (filter.kind && item.kind !== filter.kind) return false;
    if (filter.categoryId && item.category.id !== filter.categoryId) return false;
    if (filter.stock === 'in' && !item.inStock) return false;
    if (filter.stock === 'out' && item.inStock) return false;
    const haystack = `${item.title} ${item.id} ${item.color} ${item.size}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}
