import { vi } from 'vitest';

/**
 * jsdom-файли не проходять через fetch у Vitest (multipart-тіло не читається), тому в тестах
 * хуків і сторінок завантаження підміняється. Сам запит перевіряє src/api/customizer.test.ts.
 */
export const uploadPrintMock = vi.fn(async (file: File) => ({
  printFileUrl: `http://localhost:3000/files/prints/${file.name}`,
}));
