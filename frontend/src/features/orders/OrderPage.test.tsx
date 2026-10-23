import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { browser } from '../../shared/navigation';
import { renderApp } from '../../test/render';
import {
  buildCustomProduct,
  buildOrder,
  customProducts,
  orders,
  withStatus,
} from '../../test/server';
import { loadRecentOrders } from './recentOrdersStore';

const recipient = {
  fullName: 'Шевченко Тарас',
  phone: '380501234567',
  email: 'taras@example.com',
  city: 'Київ',
  warehouse: '12',
};

function seedOrder(status: Parameters<typeof withStatus>[1] = 'CREATED', patch = {}) {
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
  const order = withStatus(
    buildOrder('order-1', { items: [{ customProductId: 'cp-1', quantity: 2 }], recipient }),
    status,
    patch,
  );
  orders.set(order.id, order);
  return order;
}

describe('OrderPage', () => {
  it('shows the order with timeline, items and totals', async () => {
    seedOrder();
    renderApp('/orders/order-1');
    const timeline = await screen.findByRole('list', { name: 'Статус замовлення' });
    expect(within(timeline).getByText('Створено').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(await screen.findByText('Футболка базова')).toBeInTheDocument();
    expect(screen.getByText(/2 ×/)).toBeInTheDocument();
    // 2 × 405 + 70 доставки
    expect(screen.getByTestId('order-total')).toHaveTextContent('880');
    expect(screen.getByText(/відділення №12/)).toBeInTheDocument();
    expect(loadRecentOrders()).toEqual(['order-1']);
  });

  it('redirects to the payment page from LiqPay invoice', async () => {
    seedOrder();
    const redirect = vi.spyOn(browser, 'redirect').mockImplementation(() => {});
    const { user } = renderApp('/orders/order-1');
    await user.click(await screen.findByRole('button', { name: 'Оплатити через LiqPay' }));
    await waitFor(() =>
      expect(redirect).toHaveBeenCalledWith('http://localhost:5173/payment-result?orderId=order-1'),
    );
  });

  it('shows the TTN for a shipped order and hides the pay button', async () => {
    seedOrder('SHIPPED', { ttnNumber: 'DEV-777' });
    renderApp('/orders/order-1');
    expect(await screen.findByTestId('ttn')).toHaveTextContent('DEV-777');
    expect(screen.getByRole('link', { name: 'Відстежити' })).toHaveAttribute(
      'href',
      'https://novaposhta.ua/tracking/?cargo_number=DEV-777',
    );
    expect(screen.queryByRole('button', { name: /Оплатити/ })).not.toBeInTheDocument();
    expect(screen.queryByText('оновлюється автоматично')).not.toBeInTheDocument();
  });

  it('shows a cancelled order', async () => {
    seedOrder('CANCELLED');
    renderApp('/orders/order-1');
    expect(await screen.findByText('Замовлення скасовано')).toBeInTheDocument();
  });

  it('polls and picks up status changes', async () => {
    const order = seedOrder('PENDING_REVIEW');
    renderApp('/orders/order-1');
    await screen.findByText(/перевіряє макет/);
    orders.set(order.id, withStatus(order, 'PRINTING'));
    // інтервал опитування на сторінці замовлення 5 с
    expect(
      await screen.findByText('Макет схвалено, виріб друкується.', {}, { timeout: 7000 }),
    ).toBeInTheDocument();
  }, 10_000);

  it('shows not found', async () => {
    renderApp('/orders/nope');
    expect(
      await screen.findByRole('heading', { name: 'Замовлення не знайдено' }),
    ).toBeInTheDocument();
  });
});
