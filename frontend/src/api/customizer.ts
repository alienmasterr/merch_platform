import { api, postRaw, unwrap } from './client';
import type { CustomProduct, PrintConfigurationInput } from './types';

export function uploadPrint(file: File): Promise<{ printFileUrl: string }> {
  const form = new FormData();
  form.append('file', file, file.name);
  return postRaw('/customizer/uploads', form);
}

export function createCustomProduct(body: {
  baseItemId: string;
  prints: PrintConfigurationInput[];
}): Promise<CustomProduct> {
  return unwrap(api.POST('/customizer/products', { body }));
}

export function getCustomProduct(id: string): Promise<CustomProduct> {
  return unwrap(api.GET('/customizer/products/{id}', { params: { path: { id } } }));
}
