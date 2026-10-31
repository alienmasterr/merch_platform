import { vi } from 'vitest';

export const uploadPrintMock = vi.fn(async (file: File) => ({
  printFileUrl: `http://localhost:3000/files/prints/${file.name}`,
}));
