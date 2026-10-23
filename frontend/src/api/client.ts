import createClient from 'openapi-fetch';
import { ApiError, toApiError } from './errors';
import { roleHeader } from './session';
import type { paths } from './schema';

/** У розробці `/api` проксюється Vite на бекенд (див. vite.config.ts). */
export const API_BASE_URL = new URL(
  import.meta.env.VITE_API_BASE_URL ?? '/api',
  window.location.origin,
)
  .toString()
  .replace(/\/$/, '');

export const api = createClient<paths>({
  baseUrl: API_BASE_URL,
  // fetch беремо в момент виклику, щоб MSW у тестах міг його підмінити
  fetch: (request) => globalThis.fetch(request),
});

// Роль завжди береться з поточної сесії: типізовані виклики передають очікувану роль лише
// заради контракту OpenAPI, а перевіряє її бекенд (покупець отримає 403).
api.use({
  onRequest({ request }) {
    request.headers.delete('x-user-role');
    for (const [name, value] of Object.entries(roleHeader())) request.headers.set(name, value);
    return request;
  },
});

interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/**
 * POST із не-JSON тілом (multipart для файлів, form-urlencoded для webhook). openapi-fetch
 * серіалізує тіло як JSON, тому тут звичайний fetch із тією ж обробкою помилок.
 */
export async function postRaw<T>(path: string, body: FormData | URLSearchParams): Promise<T> {
  let response: Response;
  try {
    response = await globalThis.fetch(`${API_BASE_URL}${path}`, { method: 'POST', body });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Немає зʼєднання з сервером');
  }
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw toApiError(response.status, payload);
  return payload as T;
}

/** Повертає дані відповіді або кидає ApiError. Мережеві збої теж стають ApiError. */
export async function unwrap<T>(call: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await call;
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    throw new ApiError(0, 'NETWORK_ERROR', 'Немає зʼєднання з сервером');
  }
  if (result.response.ok && result.data !== undefined) return result.data;
  throw toApiError(result.response.status, result.error);
}
