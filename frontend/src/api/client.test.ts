import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiUrl, server } from '../test/server';
import { getCatalogItem, listCatalog } from './catalog';
import { ApiError, describeError } from './errors';

describe('api client', () => {
  it('returns parsed data on success', async () => {
    const item = await getCatalogItem('tee-white-m');
    expect(item.title).toBe('Футболка базова');
  });

  it('sends catalog filters as query params', async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl('/catalog'), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
    );
    await listCatalog({ color: 'black', minPrice: 100, inStockOnly: true });
    expect(query?.get('color')).toBe('black');
    expect(query?.get('minPrice')).toBe('100');
    expect(query?.get('inStockOnly')).toBe('true');
    expect(query?.has('size')).toBe(false);
  });

  it('omits inStockOnly when it is false', async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl('/catalog'), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
    );
    await listCatalog({ inStockOnly: false });
    expect(query?.has('inStockOnly')).toBe(false);
  });

  it('turns backend error body into ApiError', async () => {
    const error = await getCatalogItem('missing').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Product missing not found',
    });
  });

  it('reports a non-JSON 5xx as server unavailable', async () => {
    server.use(
      http.get(apiUrl('/catalog'), () => new HttpResponse('proxy error', { status: 500 })),
    );
    await expect(listCatalog()).rejects.toMatchObject({ code: 'SERVER_UNAVAILABLE', status: 500 });
  });

  it('reports a network failure as NETWORK_ERROR', async () => {
    server.use(http.get(apiUrl('/catalog'), () => HttpResponse.error()));
    await expect(listCatalog()).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });
});

describe('describeError', () => {
  it('lists validation details', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', [
      { path: ['recipient', 'phone'], message: 'Too short' },
    ]);
    expect(describeError(error)).toBe('Invalid request: recipient.phone: Too short');
  });

  it('explains 403 in user terms', () => {
    expect(describeError(new ApiError(403, 'FORBIDDEN', 'Role "admin" is required'))).toMatch(
      /Недостатньо прав/,
    );
  });

  it('falls back for unknown errors', () => {
    expect(describeError('boom')).toBe('Невідома помилка');
  });
});
