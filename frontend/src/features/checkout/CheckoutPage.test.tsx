import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render';
import { apiUrl, buildCustomProduct, customProducts, orders, server } from '../../test/server';
import { CART_STORAGE_KEY, loadCart } from '../cart/cartStore';

function seedCart() {
  customProducts.set(
    'cp-1',
    buildCustomProduct('cp-1', 'tee-white-m', [
      {
        printFileUrl: 'http://localhost:3000/files/a.png',
        placement: 'CHEST',
        technology: 'DTG',
        widthMm: 100,
        heightMm: 100,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
    ]),
  );
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify([{ customProductId: 'cp-1', quantity: 2 }]),
  );
}

async function fillForm(
  user: ReturnType<typeof renderApp>['user'],
  overrides: Record<string, string> = {},
) {
  const values = {
    'Прізвище та імʼя': 'Шевченко Тарас',
    Телефон: '0501234567',
    Email: 'taras@example.com',
    Місто: 'Київ',
    'Відділення Нової Пошти №': '12',
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    const input = await screen.findByLabelText(label);
    await user.clear(input);
    if (value) await user.type(input, value);
  }
}

describe('CheckoutPage', () => {
  it('shows field errors and does not submit invalid data', async () => {
    seedCart();
    const { user } = renderApp('/checkout');
    await fillForm(user, { Телефон: '12345', 'Відділення Нової Пошти №': 'abc' });
    await user.click(screen.getByRole('button', { name: 'Підтвердити замовлення' }));

    expect(screen.getByText('Український номер, наприклад 0501234567')).toBeInTheDocument();
    expect(screen.getByText('Лише цифри, наприклад 12')).toBeInTheDocument();
    expect(screen.getByLabelText('Телефон')).toHaveAttribute('aria-invalid', 'true');
    expect(orders.size).toBe(0);
  });

  it('quotes shipping for the city and parcel weight', async () => {
    seedCart();
    let query = '';
    server.use(
      http.get(apiUrl('/delivery/shipping-cost'), ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json({ city: 'Львів', weightKg: 1, cost: 85, currency: 'UAH' });
      }),
    );
    const { user } = renderApp('/checkout');
    await user.type(await screen.findByLabelText('Місто'), 'Львів');
    await waitFor(() => expect(screen.getByTestId('shipping-cost')).toHaveTextContent('85'));
    expect(decodeURIComponent(query)).toBe('?city=Львів&weightKg=1'); // 2 вироби × 0,5 кг
    // 2 × 405 + 85
    expect(screen.getByTestId('checkout-total')).toHaveTextContent(/895/);
  });

  it('creates the order, clears the cart and opens the order page', async () => {
    seedCart();
    const { user, router } = renderApp('/checkout');
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Підтвердити замовлення' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/orders/order-1'));
    expect(orders.get('order-1')).toMatchObject({
      items: [{ customProductId: 'cp-1', quantity: 2 }],
      recipient: { fullName: 'Шевченко Тарас', phone: '0501234567', city: 'Київ', warehouse: '12' },
    });
    expect(loadCart()).toEqual([]);
  });

  it('shows a backend validation error', async () => {
    seedCart();
    server.use(
      http.post(apiUrl('/orders'), () =>
        HttpResponse.json(
          { error: 'VALIDATION_ERROR', message: 'Recipient email is invalid' },
          { status: 400 },
        ),
      ),
    );
    const { user, router } = renderApp('/checkout');
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Підтвердити замовлення' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Recipient email is invalid');
    expect(router.state.location.pathname).toBe('/checkout');
    expect(loadCart()).toHaveLength(1);
  });

  it('prefills the last recipient', async () => {
    seedCart();
    localStorage.setItem(
      'merch.recipient.v1',
      JSON.stringify({
        fullName: 'Косач Леся',
        phone: '0671112233',
        email: 'l@x.ua',
        city: 'Луцьк',
        warehouse: '3',
      }),
    );
    renderApp('/checkout');
    expect(await screen.findByLabelText('Прізвище та імʼя')).toHaveValue('Косач Леся');
  });

  it('says the cart is empty', async () => {
    renderApp('/checkout');
    expect(await screen.findByText('Кошик порожній.')).toBeInTheDocument();
  });
});
