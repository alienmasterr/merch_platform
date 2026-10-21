import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config';

describe('loadConfig', () => {
  it('дефолти: memory + local + порт 3000', () => {
    const cfg = loadConfig({});
    expect(cfg).toMatchObject({ PORT: 3000, PERSISTENCE: 'memory', STORAGE_DRIVER: 'local', CORS_ORIGIN: 'http://localhost:5173' });
    expect(cfg.UPLOADS_DIR.endsWith('.data/uploads')).toBe(true);
  });

  it('порожні значення з .env вважаються незаданими', () => {
    const cfg = loadConfig({ NOVA_POSHTA_API_KEY: '', S3_ENDPOINT: '' });
    expect(cfg.NOVA_POSHTA_API_KEY).toBeUndefined();
  });

  it('PORT приводиться до числа', () => {
    expect(loadConfig({ PORT: '4000' }).PORT).toBe(4000);
  });

  it('негатив: postgres без DATABASE_URL', () => {
    expect(() => loadConfig({ PERSISTENCE: 'postgres' })).toThrow(/DATABASE_URL/);
  });

  it('негатив: s3 без ключів', () => {
    expect(() => loadConfig({ STORAGE_DRIVER: 's3' })).toThrow(/S3_ENDPOINT/);
  });

  it('негатив: ключ Нової Пошти без refs відправника', () => {
    expect(() => loadConfig({ NOVA_POSHTA_API_KEY: 'k' })).toThrow(/NP_SENDER_REF/);
  });

  it('негатив: невідомий драйвер', () => {
    expect(() => loadConfig({ STORAGE_DRIVER: 'ftp' })).toThrow();
  });
});
