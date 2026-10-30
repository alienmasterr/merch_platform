import { screen, within } from '@testing-library/react';
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

  it('shows staff links only to the matching role', async () => {
    const { user } = renderApp('/catalog');
    const nav = screen.getByRole('navigation', { name: 'Головне меню' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Каталог', 'Кошик']);
    expect(within(nav).queryByRole('link', { name: 'Менеджер' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Адмін' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Роль'), 'manager');
    expect(within(nav).getByRole('link', { name: 'Менеджер' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Адмін' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Роль'), 'admin');
    expect(within(nav).getByRole('link', { name: 'Адмін' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Менеджер' })).not.toBeInTheDocument();
  });

  it('shows 404 for unknown paths', async () => {
    renderApp('/does-not-exist');
    expect(
      await screen.findByRole('heading', { name: 'Сторінку не знайдено' }),
    ).toBeInTheDocument();
  });
});
