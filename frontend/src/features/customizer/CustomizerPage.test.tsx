import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/render';
import { uploadPrintMock } from '../../test/mockUpload';

vi.mock('../../api/customizer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/customizer')>()),
  uploadPrint: (file: File) => uploadPrintMock(file),
}));

vi.mock('./printFile', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./printFile')>()),
  readImageAspect: vi.fn().mockResolvedValue(1),
}));

const png = () => new File([new Uint8Array(1024)], 'logo.png', { type: 'image/png' });

describe('CustomizerPage', () => {
  it('redirects to the catalog when no base item is given', async () => {
    const { router } = renderApp('/customizer');
    await waitFor(() => expect(router.state.location.pathname).toBe('/catalog'));
  });

  it('shows the allowed placements of the item', async () => {
    renderApp('/customizer?baseItemId=tee-white-m');
    const tabs = await screen.findByRole('tablist', { name: 'Зона нанесення' });
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((t) => t.textContent),
    ).toEqual(['Груди', 'Спина', 'Рукав']);
    expect(screen.getByRole('button', { name: 'Зберегти дизайн' })).toBeDisabled();
  });

  it('validates the file on the client', async () => {
    const { user } = renderApp('/customizer?baseItemId=tee-white-m');
    const input = await screen.findByLabelText('Файл принта для зони «Груди»');
    await user.upload(input, new File(['x'], 'doc.pdf', { type: 'application/pdf' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Формат «pdf» не підтримується');
  });

  it('uploads, moves with the keyboard and saves the design', async () => {
    const { user } = renderApp('/customizer?baseItemId=tee-white-m');
    await user.upload(await screen.findByLabelText('Файл принта для зони «Груди»'), png());

    const print = await screen.findByTestId('print-CHEST');
    const before = Number(print.getAttribute('data-x'));
    fireEvent.keyDown(print, { key: 'ArrowRight' });
    await waitFor(() => expect(Number(print.getAttribute('data-x'))).toBe(before + 5));
    expect(screen.getByText('Зміщення по X: 5 мм')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Зберегти дизайн' }));
    expect(await screen.findByText('Дизайн збережено.')).toBeInTheDocument();
    expect(screen.getByTestId('saved-total')).toHaveTextContent('461');

    await user.click(screen.getByRole('button', { name: 'Додати в кошик' }));
    expect(screen.getByRole('link', { name: 'Перейти в кошик' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Кошик/ })).toHaveTextContent('1');
  });

  it('switches to the back view for the BACK placement', async () => {
    const { user } = renderApp('/customizer?baseItemId=tee-white-m');
    await user.click(await screen.findByRole('tab', { name: 'Спина' }));
    expect(screen.getByText('Вигляд ззаду')).toBeInTheDocument();
  });

  it('refuses an out-of-stock item and handles unknown ids', async () => {
    renderApp('/customizer?baseItemId=hoodie-grey-l');
    expect(await screen.findByText(/немає в наявності/)).toBeInTheDocument();
  });

  it('shows not found for an unknown base item', async () => {
    renderApp('/customizer?baseItemId=nope');
    expect(await screen.findByRole('heading', { name: 'Виріб не знайдено' })).toBeInTheDocument();
  });
});
