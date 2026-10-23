import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/errors';

/** Повторюємо лише збої мережі/сервера: 4xx (404, 400, 403) повтор не виправить. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000, refetchOnWindowFocus: false },
    },
  });
}
