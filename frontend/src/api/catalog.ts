import { api, unwrap } from './client';
import type { ApparelItem, CatalogFilter, Category } from './types';

export function getHealth(): Promise<{ status: string }> {
  return unwrap(api.GET('/health'));
}

export function listCategories(): Promise<Category[]> {
  return unwrap(api.GET('/catalog/categories'));
}

export function listCatalog(filter: CatalogFilter = {}): Promise<ApparelItem[]> {
  const { inStockOnly, ...rest } = filter;
  return unwrap(
    api.GET('/catalog', {
      params: { query: { ...rest, ...(inStockOnly ? { inStockOnly: 'true' as const } : {}) } },
    }),
  );
}

export function getCatalogItem(id: string): Promise<ApparelItem> {
  return unwrap(api.GET('/catalog/{id}', { params: { path: { id } } }));
}
