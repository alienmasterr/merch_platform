import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/errors';
import { itemById } from '../../test/fixtures';
import { createTestQueryClient } from '../../test/render';
import { uploadPrintMock } from '../../test/mockUpload';
import { apiUrl, server } from '../../test/server';
import { useCustomizer } from './useCustomizer';

vi.mock('../../api/customizer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/customizer')>()),
  uploadPrint: (file: File) => uploadPrintMock(file),
}));

vi.mock('./printFile', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./printFile')>()),
  readImageAspect: vi.fn().mockResolvedValue(2),
}));

const tee = itemById('tee-white-m');
const png = (name = 'logo.png', size = 2048) =>
  new File([new Uint8Array(size)], name, { type: 'image/png' });

function setup() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useCustomizer(tee), { wrapper });
}

describe('useCustomizer', () => {
  it('starts on the first allowed placement with base price as estimate', () => {
    const { result } = setup();
    expect(result.current.state.activePlacement).toBe('CHEST');
    expect(result.current.prints).toEqual([]);
    expect(result.current.estimate).toBe(380);
  });

  it('rejects an invalid file without calling the API', async () => {
    uploadPrintMock.mockClear();
    const { result } = setup();
    act(() => result.current.addFile(new File(['x'], 'anim.gif', { type: 'image/gif' })));
    expect(result.current.fileError).toMatch(/gif/);
    expect(uploadPrintMock).not.toHaveBeenCalled();
  });

  it('uploads a valid file into the active placement', async () => {
    const { result } = setup();
    act(() => result.current.selectPlacement('BACK'));
    act(() => result.current.addFile(png()));
    await waitFor(() => expect(result.current.prints).toHaveLength(1));
    expect(result.current.state.prints.BACK).toMatchObject({
      printFileUrl: 'http://localhost:3000/files/prints/logo.png',
      widthMm: 210,
      heightMm: 105,
    });
    expect(result.current.fileError).toBeNull();
    expect(result.current.estimate).toBeGreaterThan(380);
  });

  it('surfaces an upload error from the backend', async () => {
    uploadPrintMock.mockRejectedValueOnce(new ApiError(413, 'UPLOAD_ERROR', 'File too large'));
    const { result } = setup();
    act(() => result.current.addFile(png()));
    await waitFor(() => expect(result.current.upload.isError).toBe(true));
    expect(result.current.upload.error).toMatchObject({ code: 'UPLOAD_ERROR' });
    expect(result.current.prints).toEqual([]);
  });

  it('saves the configuration and exposes the backend result', async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl('/customizer/products'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            id: 'cp-9',
            baseItem: tee,
            prints: [],
            previewImageUrl: null,
            mockupApproved: false,
            totalCost: 999,
          },
          { status: 201 },
        );
      }),
    );
    const { result } = setup();
    act(() => result.current.addFile(png()));
    await waitFor(() => expect(result.current.prints).toHaveLength(1));
    act(() => result.current.moveBy('CHEST', 10, 20));
    act(() => result.current.save.mutate());
    await waitFor(() => expect(result.current.saved?.id).toBe('cp-9'));

    expect(body).toEqual({
      baseItemId: 'tee-white-m',
      prints: [
        {
          printFileUrl: 'http://localhost:3000/files/prints/logo.png',
          placement: 'CHEST',
          technology: 'DTG',
          widthMm: 180,
          heightMm: 90,
          offsetX: 10,
          offsetY: 20,
          scale: 1,
        },
      ],
    });
  });

  it('drops the saved result after further edits', async () => {
    const { result } = setup();
    act(() => result.current.addFile(png()));
    await waitFor(() => expect(result.current.prints).toHaveLength(1));
    act(() => result.current.save.mutate());
    await waitFor(() => expect(result.current.saved).not.toBeNull());
    act(() => result.current.setTechnology('CHEST', 'EMBROIDERY'));
    expect(result.current.saved).toBeNull();
  });
});
