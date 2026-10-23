import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { setRole } from '../../api/session';
import { renderApp } from '../../test/render';
import { apiUrl, buildOrder, orders, server, withStatus } from '../../test/server';
import { cancelRefunds, canReviewMockup, manualTransitions } from './managerActions';

const recipient = {
  fullName: 'Шевченко Тарас',
  phone: '380501234567',
  email: 't@x.ua',
  city: 'Київ',
  warehouse: '1',
};

function seed(id: string, status: Parameters<typeof withStatus>[1]) {
  const order = withStatus(
    buildOrder(id, { items: [{ customProductId: 'cp-x', quantity: 1 }], recipient }),
    status,
  );
  orders.set(id, order);
  return order;
}

// мокапи в картках тягнуть вироби; у цих тестах вони не важливі
const noProducts = http.get(apiUrl('/customizer/products/:id'), () =>
  HttpResponse.json({ error: 'NOT_FOUND', message: 'nope' }, { status: 404 }),
);

describe('managerActions', () => {
  it('offers only manual transitions', () => {
    expect(manualTransitions({ allowedNextStatuses: ['PAID', 'CANCELLED'] })).toEqual([
      'CANCELLED',
    ]);
    expect(manualTransitions({ allowedNextStatuses: ['PRINTING', 'CANCELLED'] })).toEqual([
      'CANCELLED',
    ]);
    expect(manualTransitions({ allowedNextStatuses: ['SHIPPED'] })).toEqual(['SHIPPED']);
    expect(manualTransitions({ allowedNextStatuses: [] })).toEqual([]);
  });

  it('knows when mockup review and refunds apply', () => {
    expect(canReviewMockup({ status: 'PENDING_REVIEW' })).toBe(true);
    expect(canReviewMockup({ status: 'PAID' })).toBe(false);
    expect(cancelRefunds({ status: 'PAID' })).toBe(true);
    expect(cancelRefunds({ status: 'CREATED' })).toBe(false);
  });
});

describe('ManagerPage', () => {
  it('shows 403 from the backend without the manager role', async () => {
    renderApp('/manager');
    expect(await screen.findByRole('alert')).toHaveTextContent('Недостатньо прав');
  });

  it('lists orders waiting for review and approves a mockup', async () => {
    server.use(noProducts);
    setRole('manager');
    seed('order-1', 'PENDING_REVIEW');
    seed('order-2', 'PRINTING');
    const { user } = renderApp('/manager');

    const card = await screen.findByRole('article', { name: 'Замовлення order-1' });
    expect(screen.queryByRole('article', { name: 'Замовлення order-2' })).not.toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Схвалити макет' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Замовлення order-1: статус «У друці»',
    );
    expect(orders.get('order-1')?.status).toBe('PRINTING');
    // замовлення пішло з вкладки «Перевірка макета»
    await waitFor(() =>
      expect(screen.queryByRole('article', { name: 'Замовлення order-1' })).not.toBeInTheDocument(),
    );
  });

  it('asks for confirmation before rejecting', async () => {
    server.use(noProducts);
    setRole('manager');
    seed('order-1', 'PENDING_REVIEW');
    const { user } = renderApp('/manager');
    const card = await screen.findByRole('article', { name: 'Замовлення order-1' });

    await user.click(within(card).getByRole('button', { name: 'Відхилити' }));
    expect(within(card).getByText(/Кошти буде повернуто/)).toBeInTheDocument();
    expect(orders.get('order-1')?.status).toBe('PENDING_REVIEW');

    await user.click(within(card).getByRole('button', { name: 'Так, відхилити' }));
    await waitFor(() => expect(orders.get('order-1')?.status).toBe('CANCELLED'));
  });

  it('ships an order from the printing tab', async () => {
    server.use(noProducts);
    setRole('manager');
    seed('order-1', 'PRINTING');
    const { user } = renderApp('/manager?status=PRINTING');
    const card = await screen.findByRole('article', { name: 'Замовлення order-1' });
    await user.click(within(card).getByRole('button', { name: 'Передати в Нову Пошту' }));
    await waitFor(() =>
      expect(orders.get('order-1')).toMatchObject({ status: 'SHIPPED', ttnNumber: 'DEV-1' }),
    );
  });

  it('shows warnings and retries notifications', async () => {
    let notified = 0;
    server.use(
      noProducts,
      http.patch(apiUrl('/manager/orders/:id/status'), () =>
        HttpResponse.json({
          ...withStatus(orders.get('order-1')!, 'SHIPPED'),
          warnings: ['Nova Poshta: TTN was not created'],
        }),
      ),
      http.post(apiUrl('/manager/orders/:id/notify'), () => {
        notified += 1;
        return HttpResponse.json({
          ...withStatus(orders.get('order-1')!, 'SHIPPED', { ttnNumber: 'DEV-2' }),
          warnings: [],
        });
      }),
    );
    setRole('manager');
    seed('order-1', 'PRINTING');
    const { user } = renderApp('/manager?status=PRINTING');
    const card = await screen.findByRole('article', { name: 'Замовлення order-1' });
    await user.click(within(card).getByRole('button', { name: 'Передати в Нову Пошту' }));

    expect(await screen.findByText('Nova Poshta: TTN was not created')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Повторити сповіщення' }));
    await waitFor(() => expect(notified).toBe(1));
    expect(await screen.findByRole('status')).toHaveTextContent('ТТН DEV-2');
  });

  it('switches tabs via the URL', async () => {
    setRole('manager');
    const { user, router } = renderApp('/manager');
    await user.click(await screen.findByRole('tab', { name: 'Відправлено' }));
    expect(router.state.location.search).toBe('?status=SHIPPED');
    expect(
      await screen.findByText('Замовлень зі статусом «Відправлено» немає.'),
    ).toBeInTheDocument();
  });

  it('sends the role picked in the header', async () => {
    const { user } = renderApp('/manager');
    await screen.findByRole('alert');
    await user.selectOptions(screen.getByLabelText('Роль'), 'manager');
    expect(
      await screen.findByText('Замовлень зі статусом «Перевірка макета» немає.'),
    ).toBeInTheDocument();
  });
});
