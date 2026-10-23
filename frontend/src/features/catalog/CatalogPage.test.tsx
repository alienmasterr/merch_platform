import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { catalogItems } from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { apiUrl, server } from '../../test/server';

/** Запам'ятовує query кожного запиту до /catalog і фільтрує фікстури за кольором. */
function recordCatalogQueries() {
  const queries: string[] = [];
  server.use(
    http.get(apiUrl('/catalog'), ({ request }) => {
      const params = new URL(request.url).searchParams;
      queries.push(params.toString());
      const color = params.get('color');
      return HttpResponse.json(
        color ? catalogItems.filter((i) => i.color === color) : catalogItems,
      );
    }),
  );
  return queries;
}

describe('CatalogPage', () => {
  it('shows products grouped by title with prices', async () => {
    renderApp('/catalog');
    const list = await screen.findByRole('region', { name: 'Товари' });
    expect(
      await within(list).findByRole('heading', { name: 'Футболка базова' }),
    ).toBeInTheDocument();
    expect(within(list).getAllByRole('article')).toHaveLength(3);
    expect(within(list).getByText('Немає в наявності')).toBeInTheDocument();
    expect(within(list).getByRole('link', { name: /Футболка базова/ })).toHaveAttribute(
      'href',
      '/product/tee-white-m',
    );
  });

  it('applies a color filter via URL and API query', async () => {
    const queries = recordCatalogQueries();
    const { user, router } = renderApp('/catalog');
    await user.click(await screen.findByRole('button', { name: 'Чорний' }));

    await waitFor(() => expect(router.state.location.search).toBe('?color=black'));
    await waitFor(() => expect(queries).toContain('color=black'));
    const list = screen.getByRole('region', { name: 'Товари' });
    await waitFor(() => expect(within(list).getAllByRole('article')).toHaveLength(1));
    expect(screen.getByRole('button', { name: 'Чорний' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('reads the filter from the URL on load', async () => {
    const queries = recordCatalogQueries();
    renderApp('/catalog?categoryId=cat-tshirts&inStockOnly=true');
    await waitFor(() => expect(queries).toContain('categoryId=cat-tshirts&inStockOnly=true'));
    expect(await screen.findByRole('checkbox', { name: 'Лише в наявності' })).toBeChecked();
  });

  it('debounces price input into the URL', async () => {
    const { user, router } = renderApp('/catalog');
    await user.type(await screen.findByLabelText('Ціна від'), '300');
    await waitFor(() => expect(router.state.location.search).toBe('?minPrice=300'));
  });

  it('shows an empty state with a reset button', async () => {
    server.use(http.get(apiUrl('/catalog'), () => HttpResponse.json([])));
    const { user, router } = renderApp('/catalog?color=red');
    expect(await screen.findByText('За цими фільтрами нічого не знайдено.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Скинути фільтри' }));
    expect(router.state.location.search).toBe('');
  });

  it('shows an error with retry when the API fails', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/catalog'), () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              { error: 'INTERNAL_ERROR', message: 'Internal server error' },
              { status: 500 },
            )
          : HttpResponse.json(catalogItems);
      }),
    );
    // запит без фільтрів робиться двічі (результати й опції), тож другий уже успішний
    const { user } = renderApp('/catalog?size=M');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Internal server error');
    await user.click(within(alert).getByRole('button', { name: 'Спробувати ще раз' }));
    expect(await screen.findAllByRole('article')).not.toHaveLength(0);
  });
});
