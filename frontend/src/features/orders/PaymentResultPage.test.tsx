import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render';
import { buildOrder, orders, withStatus } from '../../test/server';

const recipient = {
  fullName: 'Шевченко Тарас',
  phone: '380501234567',
  email: 't@x.ua',
  city: 'Київ',
  warehouse: '1',
};

describe('PaymentResultPage', () => {
  it('waits for the webhook and confirms payment via the dev callback', async () => {
    orders.set(
      'order-1',
      buildOrder('order-1', { items: [{ customProductId: 'cp-x', quantity: 1 }], recipient }),
    );
    const { user } = renderApp('/payment-result?orderId=order-1');
    expect(await screen.findByText(/Очікуємо підтвердження оплати/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Імітувати успішну оплату' }));
    // сторінка опитує замовлення кожні 2 с
    expect(
      await screen.findByText(/Оплату .* отримано/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(orders.get('order-1')?.status).toBe('PENDING_REVIEW');
  });

  it('shows success right away for a paid order', async () => {
    const order = buildOrder('order-2', {
      items: [{ customProductId: 'cp-x', quantity: 1 }],
      recipient,
    });
    orders.set(order.id, withStatus(order, 'PENDING_REVIEW'));
    renderApp('/payment-result?orderId=order-2');
    expect(await screen.findByText(/Чек надіслано на t@x.ua/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Імітувати успішну оплату' }),
    ).not.toBeInTheDocument();
  });

  it('handles a missing order id', async () => {
    renderApp('/payment-result');
    expect(await screen.findByText('Не вказано номер замовлення.')).toBeInTheDocument();
  });
});
