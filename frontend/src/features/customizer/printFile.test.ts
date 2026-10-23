import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  getFileExtension,
  MAX_PRINT_FILE_BYTES,
  validatePrintFile,
} from './printFile';

const file = (name: string, size = 1000, type = 'image/png') => ({ name, size, type });

describe('validatePrintFile', () => {
  it.each(['logo.png', 'photo.JPG', 'pic.jpeg', 'art.webp', 'vector.svg'])('accepts %s', (name) => {
    expect(validatePrintFile(file(name))).toEqual({ ok: true });
  });

  it('rejects unsupported formats', () => {
    const result = validatePrintFile(file('anim.gif', 1000, 'image/gif'));
    expect(result).toEqual({ ok: false, error: expect.stringContaining('«gif» не підтримується') });
  });

  it('rejects files without extension', () => {
    expect(validatePrintFile(file('README'))).toMatchObject({
      ok: false,
      error: expect.stringContaining('без розширення'),
    });
  });

  it('rejects a renamed non-image file', () => {
    expect(validatePrintFile(file('doc.png', 1000, 'application/pdf'))).toMatchObject({
      ok: false,
    });
  });

  it('rejects empty files', () => {
    expect(validatePrintFile(file('a.png', 0))).toEqual({ ok: false, error: 'Файл порожній.' });
  });

  it('accepts exactly 20 MB and rejects one byte more', () => {
    expect(validatePrintFile(file('a.png', MAX_PRINT_FILE_BYTES))).toEqual({ ok: true });
    expect(validatePrintFile(file('a.png', MAX_PRINT_FILE_BYTES + 1))).toMatchObject({
      ok: false,
      error: expect.stringContaining('Максимум 20 МБ'),
    });
  });

  it('accepts files with an empty MIME type (some systems do not set it)', () => {
    expect(validatePrintFile(file('a.svg', 10, ''))).toEqual({ ok: true });
  });
});

describe('helpers', () => {
  it('extracts lower-cased extensions', () => {
    expect(getFileExtension('My.Logo.PNG')).toBe('png');
    expect(getFileExtension('noext')).toBe('');
  });

  it('formats sizes', () => {
    expect(formatBytes(500)).toBe('500 Б');
    expect(formatBytes(2048)).toBe('2 КБ');
    expect(formatBytes(25 * 1024 * 1024)).toBe('25.00 МБ');
  });
});
