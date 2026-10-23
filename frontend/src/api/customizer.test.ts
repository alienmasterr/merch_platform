import { describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from './client';
import { uploadPrint } from './customizer';

describe('uploadPrint', () => {
  // multipart через MSW у jsdom не проходить, тож перевіряємо сам запит, підмінивши fetch
  it('posts the file as multipart field "file"', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json({ printFileUrl: 'http://localhost:3000/files/x.png' }, { status: 201 }),
      );
    const file = new File(['png'], 'x.png', { type: 'image/png' });

    await expect(uploadPrint(file)).resolves.toEqual({
      printFileUrl: 'http://localhost:3000/files/x.png',
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${API_BASE_URL}/customizer/uploads`);
    expect(init?.method).toBe('POST');
    const body = init?.body as FormData;
    expect((body.get('file') as File).name).toBe('x.png');
  });

  it('turns an error response into ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ error: 'UPLOAD_ERROR', message: 'File too large' }, { status: 413 }),
    );
    await expect(uploadPrint(new File(['x'], 'x.png'))).rejects.toMatchObject({
      status: 413,
      code: 'UPLOAD_ERROR',
    });
  });

  it('reports a network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
    await expect(uploadPrint(new File(['x'], 'x.png'))).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });
});
