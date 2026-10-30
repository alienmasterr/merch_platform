import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { setRole } from '../../api/session';
import { renderApp } from '../../test/render';
import { apiUrl, server } from '../../test/server';

describe('AdminPage', () => {
  it('shows a red "no rights" alert and no controls without the admin role', async () => {
    setRole('manager');
    renderApp('/admin');
    expect(await screen.findByRole('alert')).toHaveTextContent('Недостатньо прав для цієї дії');
    expect(screen.queryByRole('region', { name: 'Каталог' })).not.toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Новий товар' })).not.toBeInTheDocument();
  });

  it('lists the catalog as admin', async () => {
    setRole('admin');
    renderApp('/admin');
    const table = await screen.findByRole('region', { name: 'Каталог' });
    expect(await within(table).findAllByRole('row')).toHaveLength(5); // заголовок + 4 товари
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('still shows the backend 403 if the server rejects a change', async () => {
    setRole('admin');
    server.use(
      http.patch(apiUrl('/admin/catalog/:id'), () =>
        HttpResponse.json(
          { error: 'FORBIDDEN', message: 'Role "admin" is required' },
          { status: 403 },
        ),
      ),
    );
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

  it('opens the form with the + button, validates and creates an accessory', async () => {
    setRole('admin');
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(apiUrl('/admin/catalog'), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...body, id: 'cap-1' }, { status: 201 });
      }),
    );
    const { user } = renderApp('/admin');
    expect(screen.queryByRole('form', { name: 'Новий товар' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Додати товар' }));
    const form = screen.getByRole('form', { name: 'Новий товар' });

    await user.click(within(form).getByRole('button', { name: 'Зберегти товар' }));
    expect(within(form).getByText('Вкажіть назву')).toBeInTheDocument();
    expect(body).toBeUndefined();

    await user.selectOptions(within(form).getByLabelText('Тип'), 'ACCESSORY');
    // для аксесуара одна відповідна категорія, вона обирається сама
    expect(within(form).getByLabelText('Категорія')).toHaveValue('cat-accessories');
    await user.type(within(form).getByLabelText('Назва'), 'Кепка');
    await user.type(within(form).getByLabelText('Ціна, грн'), '250');
    await user.type(within(form).getByLabelText('Розмір'), 'ONE');
    await user.type(within(form).getByLabelText('Колір (англ., напр. black)'), 'black');
    await user.type(within(form).getByLabelText('Тип аксесуара (mug, tote-bag…)'), 'cap');
    await user.click(within(form).getByRole('button', { name: 'Зберегти товар' }));

    expect(await screen.findByText('Додано «Кепка» (cap-1).')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Новий товар' })).not.toBeInTheDocument();
    expect(body).toMatchObject({
      kind: 'ACCESSORY',
      title: 'Кепка',
      basePrice: 250,
      accessoryType: 'cap',
      categoryId: 'cat-accessories',
    });
    expect(body).not.toHaveProperty('hasHood');
  });

  it('offers only categories that fit the chosen type in the form', async () => {
    setRole('admin');
    const { user } = renderApp('/admin');
    await user.click(await screen.findByRole('button', { name: 'Додати товар' }));
    const form = screen.getByRole('form', { name: 'Новий товар' });
    const options = () =>
      within(within(form).getByLabelText('Категорія'))
        .getAllByRole('option')
        .map((o) => o.textContent);

    // за замовчуванням тип «Верхній одяг»: аксесуарів серед категорій немає
    expect(options()).toEqual(['—', 'Футболки', 'Худі']);
    await user.selectOptions(within(form).getByLabelText('Категорія'), 'cat-hoodies');
    await user.selectOptions(within(form).getByLabelText('Тип'), 'ACCESSORY');
    expect(options()).toEqual(['—', 'Аксесуари']);
    expect(within(form).getByLabelText('Категорія')).toHaveValue('cat-accessories');

    await user.click(within(form).getByRole('button', { name: 'Скасувати' }));
    expect(screen.queryByRole('form', { name: 'Новий товар' })).not.toBeInTheDocument();
  });

  it('filters the table by search, type, category and stock', async () => {
    setRole('admin');
    const { user } = renderApp('/admin');
    const table = await screen.findByRole('region', { name: 'Каталог' });
    await within(table).findAllByRole('row');
    const filters = screen.getByRole('search', { name: 'Фільтри каталогу' });
    const rows = () => within(table).queryAllByRole('row').length - 1;

    await user.type(within(filters).getByLabelText('Пошук'), 'black');
    expect(rows()).toBe(1);
    expect(within(table).getByText('1 з 4')).toBeInTheDocument();
    await user.clear(within(filters).getByLabelText('Пошук'));

    await user.selectOptions(within(filters).getByLabelText('Тип'), 'TOP');
    const categoryOptions = within(within(filters).getByLabelText('Категорія'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(categoryOptions).toEqual(['Усі категорії', 'Футболки', 'Худі']);
    expect(rows()).toBe(3);

    await user.selectOptions(within(filters).getByLabelText('Наявність'), 'out');
    expect(rows()).toBe(1);
    await user.click(within(filters).getByRole('button', { name: 'Скинути' }));
    expect(rows()).toBe(4);
  });
});
