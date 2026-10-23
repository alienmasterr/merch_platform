import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { setRole } from '../../api/session';
import { renderApp } from '../../test/render';
import { apiUrl, server } from '../../test/server';

describe('AdminPage', () => {
  it('lists the catalog', async () => {
    renderApp('/admin');
    const table = await screen.findByRole('region', { name: 'Каталог' });
    expect(await within(table).findAllByRole('row')).toHaveLength(5); // заголовок + 4 товари
    expect(screen.getByText(/Оберіть роль «Адміністратор»/)).toBeInTheDocument();
  });

  it('shows the backend 403 when changing data without the admin role', async () => {
    const { user } = renderApp('/admin');
    await user.click(await screen.findByLabelText('В наявності tee-white-m'));
    expect(await screen.findByText(/Недостатньо прав/)).toBeInTheDocument();
  });

  it('updates the price as admin', async () => {
    setRole('admin');
    let body: unknown;
    server.use(
      http.patch(apiUrl('/admin/catalog/:id'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ error: 'X', message: 'stop' }, { status: 409 });
      }),
    );
    const { user } = renderApp('/admin');
    const input = await screen.findByLabelText('Ціна tee-white-m');
    await user.clear(input);
    await user.type(input, '399,5');
    const row = input.closest('tr') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: 'Зберегти' }));
    await waitFor(() => expect(body).toEqual({ basePrice: 399.5 }));
    expect(await within(row).findByText('stop')).toBeInTheDocument();
  });

  it('toggles stock as admin and confirms', async () => {
    setRole('admin');
    const { user } = renderApp('/admin');
    await user.click(await screen.findByLabelText('В наявності tee-white-m'));
    expect(await screen.findByText('Збережено')).toBeInTheDocument();
  });

  it('validates and creates an item with kind-specific fields', async () => {
    setRole('admin');
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(apiUrl('/admin/catalog'), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...body, id: 'cap-1' }, { status: 201 });
      }),
    );
    const { user } = renderApp('/admin');
    const form = await screen.findByRole('form', { name: 'Новий товар' });

    await user.click(within(form).getByRole('button', { name: 'Додати товар' }));
    expect(within(form).getByText('Вкажіть назву')).toBeInTheDocument();
    expect(body).toBeUndefined();

    await user.selectOptions(within(form).getByLabelText('Тип'), 'ACCESSORY');
    await user.selectOptions(within(form).getByLabelText('Категорія'), 'cat-accessories');
    await user.type(within(form).getByLabelText('Назва'), 'Кепка');
    await user.type(within(form).getByLabelText('Ціна, грн'), '250');
    await user.type(within(form).getByLabelText('Розмір'), 'ONE');
    await user.type(within(form).getByLabelText('Колір (англ., напр. black)'), 'black');
    await user.type(within(form).getByLabelText('Тип аксесуара (mug, tote-bag…)'), 'cap');
    await user.click(within(form).getByRole('button', { name: 'Додати товар' }));

    expect(await within(form).findByText('Додано «Кепка» (cap-1).')).toBeInTheDocument();
    expect(body).toMatchObject({
      kind: 'ACCESSORY',
      title: 'Кепка',
      basePrice: 250,
      accessoryType: 'cap',
      categoryId: 'cat-accessories',
    });
    expect(body).not.toHaveProperty('hasHood');
  });
});
