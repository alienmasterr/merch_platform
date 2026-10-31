import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render';
import { buildCustomProduct, customProducts } from '../../test/server';
import { CART_STORAGE_KEY, loadCart } from './cartStore';

const chestPrint = {
  printFileUrl: 'http://localhost:3000/files/prints/a.png',
  placement: 'CHEST' as const,
  technology: 'DTG' as const,
  widthMm: 100,
  heightMm: 100,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};

function seedCart(lines: { id: string; quantity: number }[], missing: string[] = []) {
  for (const { id } of lines) {
    if (!missing.includes(id))
      customProducts.set(id, buildCustomProduct(id, 'tee-white-m', [chestPrint]));
  }
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(lines.map((l) => ({ customProductId: l.id, quantity: l.quantity }))),
  );
}

describe('CartPage', () => {
  it('shows an empty cart', async () => {
    renderApp('/cart');
    expect(await screen.findByText(/Кошик порожній/)).toBeInTheDocument();
  });

  it('lists products with prices and the total', async () => {
    seedCart([
      { id: 'cp-1', quantity: 2 },
      { id: 'cp-2', quantity: 1 },
    ]);
    renderApp('/cart');
    const lines = await screen.findByRole('list', { name: 'Позиції кошика' });
    await waitFor(() => expect(within(lines).getAllByText('Футболка базова')).toHaveLength(2));
    expect(screen.getByTestId('cart-total')).toHaveTextContent(/1\s215/);
    expect(screen.getByRole('link', { name: /Кошик/ })).toHaveTextContent('3');
  });

  it('changes quantity and persists it', async () => {
    seedCart([{ id: 'cp-1', quantity: 1 }]);
    const { user } = renderApp('/cart');
    await user.click(await screen.findByRole('button', { name: 'Більше' }));
    await waitFor(() => expect(screen.getByTestId('cart-total')).toHaveTextContent('810'));
    expect(loadCart()).toEqual([{ customProductId: 'cp-1', quantity: 2 }]);
  });

  it('removes a line', async () => {
    seedCart([{ id: 'cp-1', quantity: 1 }]);
    const { user } = renderApp('/cart');
    await user.click(await screen.findByRole('button', { name: 'Видалити' }));
    expect(await screen.findByText(/Кошик порожній/)).toBeInTheDocument();
    expect(loadCart()).toEqual([]);
  });

  it('blocks checkout while a product is unavailable', async () => {
    seedCart(
      [
        { id: 'cp-1', quantity: 1 },
        { id: 'gone', quantity: 1 },
      ],
      ['gone'],
    );
    renderApp('/cart');
    expect(await screen.findByText('Цей виріб більше недоступний.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Оформити замовлення' })).toBeDisabled();
  });

  it('goes to checkout', async () => {
    seedCart([{ id: 'cp-1', quantity: 1 }]);
    const { user, router } = renderApp('/cart');
    const button = await screen.findByRole('button', { name: 'Оформити замовлення' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    expect(router.state.location.pathname).toBe('/checkout');
  });
});
