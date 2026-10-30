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
  it('waits for the payment webhook and then confirms the payment', async () => {
    const order = buildOrder('order-1', {
      items: [{ customProductId: 'cp-x', quantity: 1 }],
      recipient,
    });
    orders.set(order.id, order);
    renderApp('/payment-result?orderId=order-1');
    expect(await screen.findByText(/Очікуємо підтвердження оплати/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    // як бекенд після callback від платіжки (заглушка шле його через 1–5 с)
    setTimeout(() => orders.set(order.id, withStatus(order, 'PENDING_REVIEW')), 1500);
    expect(
      await screen.findByText(/Оплату .* отримано/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
  });

  it('shows success right away for a paid order', async () => {
    const order = buildOrder('order-2', {
      items: [{ customProductId: 'cp-x', quantity: 1 }],
      recipient,
    });
    orders.set(order.id, withStatus(order, 'PENDING_REVIEW'));
    renderApp('/payment-result?orderId=order-2');
    expect(await screen.findByText(/Чек надіслано на t@x.ua/)).toBeInTheDocument();
  });

  it('shows a cancelled order', async () => {
    const order = buildOrder('order-3', {
      items: [{ customProductId: 'cp-x', quantity: 1 }],
      recipient,
    });
    orders.set(order.id, withStatus(order, 'CANCELLED'));
    renderApp('/payment-result?orderId=order-3');
    expect(await screen.findByText('Замовлення скасовано.')).toBeInTheDocument();
  });

  it('handles a missing order id', async () => {
    renderApp('/payment-result');
    expect(await screen.findByText('Не вказано номер замовлення.')).toBeInTheDocument();
  });
});
