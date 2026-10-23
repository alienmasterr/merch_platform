import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render';

describe('ProductPage', () => {
  it('shows item details and a link to the customizer', async () => {
    renderApp('/product/tee-white-m');
    expect(await screen.findByRole('heading', { name: 'Футболка базова' })).toBeInTheDocument();
    expect(screen.getByText('В наявності')).toBeInTheDocument();
    expect(screen.getByText('Груди, Спина, Рукав')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Створити дизайн' })).toHaveAttribute(
      'href',
      '/customizer?baseItemId=tee-white-m',
    );
  });

  it('switches to another variant when a size is picked', async () => {
    const { user, router } = renderApp('/product/tee-white-m');
    await user.click(await screen.findByRole('button', { name: 'L' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/product/tee-black-l'));
    expect(await screen.findByRole('button', { name: /Чорний/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('does not offer customizing an out-of-stock item', async () => {
    renderApp('/product/hoodie-grey-l');
    expect(await screen.findByText(/немає в наявності\. Оберіть/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Створити дизайн' })).not.toBeInTheDocument();
  });

  it('shows "not found" for an unknown id', async () => {
    renderApp('/product/nope');
    expect(await screen.findByRole('heading', { name: 'Товар не знайдено' })).toBeInTheDocument();
  });
});
