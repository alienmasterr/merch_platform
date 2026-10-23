import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test/render';

describe('routing', () => {
  it('redirects / to the catalog', async () => {
    const { router } = renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Каталог' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/catalog');
  });

  it('navigates through the header links', async () => {
    const { user, router } = renderApp('/catalog');
    await user.click(screen.getByRole('link', { name: 'Кошик' }));
    expect(router.state.location.pathname).toBe('/cart');
    expect(screen.getByRole('link', { name: 'Кошик' })).toHaveClass('active');
  });

  it('shows 404 for unknown paths', async () => {
    renderApp('/does-not-exist');
    expect(
      await screen.findByRole('heading', { name: 'Сторінку не знайдено' }),
    ).toBeInTheDocument();
  });
});
