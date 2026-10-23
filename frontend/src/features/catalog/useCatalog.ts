import { useQuery } from '@tanstack/react-query';
import { getCatalogItem, listCatalog, listCategories } from '../../api/catalog';
import type { CatalogFilter } from '../../api/types';

export const catalogKeys = {
  all: ['catalog'] as const,
  list: (filter: CatalogFilter) => ['catalog', 'list', filter] as const,
  item: (id: string) => ['catalog', 'item', id] as const,
  categories: ['catalog', 'categories'] as const,
};

export function useCatalog(filter: CatalogFilter = {}) {
  return useQuery({ queryKey: catalogKeys.list(filter), queryFn: () => listCatalog(filter) });
}

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });
}

export function useCatalogItem(id: string | undefined) {
  return useQuery({
    queryKey: catalogKeys.item(id ?? ''),
    queryFn: () => getCatalogItem(id ?? ''),
    enabled: !!id,
  });
}
