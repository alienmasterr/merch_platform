import { api, unwrap } from './client';
import type { ApparelItem, CreateApparelItemRequest } from './types';

const header = { 'x-user-role': 'admin' } as const;

export function createCatalogItem(body: CreateApparelItemRequest): Promise<ApparelItem> {
  return unwrap(api.POST('/admin/catalog', { params: { header }, body }));
}

export function updateCatalogItem(
  id: string,
  patch: { basePrice?: number; inStock?: boolean },
): Promise<ApparelItem> {
  return unwrap(
    api.PATCH('/admin/catalog/{id}', { params: { header, path: { id } }, body: patch }),
  );
}
