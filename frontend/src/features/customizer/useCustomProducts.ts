import { useQueries } from '@tanstack/react-query';
import { getCustomProduct } from '../../api/customizer';
import type { CustomProduct } from '../../api/types';

export const customProductKey = (id: string) => ['customProduct', id] as const;

export interface CustomProductsResult {
  byId: Record<string, CustomProduct | undefined>;
  errors: Record<string, unknown>;
  isPending: boolean;
}

export function useCustomProducts(ids: string[]): CustomProductsResult {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: customProductKey(id),
      queryFn: () => getCustomProduct(id),
      staleTime: Number.POSITIVE_INFINITY,
    })),
    combine: (results) => {
      const byId: Record<string, CustomProduct | undefined> = {};
      const errors: Record<string, unknown> = {};
      results.forEach((r, i) => {
        const id = ids[i] as string;
        byId[id] = r.data;
        if (r.isError) errors[id] = r.error;
      });
      return { byId, errors, isPending: results.some((r) => r.isPending) };
    },
  });
}
