import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PutObjectCommand } from '@aws-sdk/client-s3';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalDiskStorageService } from '../infrastructure/local-disk-storage-service';
import { S3StorageService } from '../infrastructure/s3-storage-service';
import { buildStorageKey, contentTypeFor } from '../infrastructure/storage-keys';

describe('storage keys', () => {
  it('санітизує імена файлів і блокує path traversal', () => {
    const key = buildStorageKey('prints', '../../etc/пас swd.png', 'id1');
    expect(key.startsWith('prints/id1-')).toBe(true);
    expect(key).not.toContain('..');
    expect(key.split('/')).toHaveLength(2);
  });

  it('порожнє ім\u02bcя отримує запасне', () => {
    expect(buildStorageKey('p', '###', 'i')).toBe('p/i-_');
    expect(buildStorageKey('p', '', 'i')).toBe('p/i-file');
  });

  it('content type за розширенням', () => {
    expect(contentTypeFor('a.PNG')).toBe('image/png');
    expect(contentTypeFor('a.svg')).toBe('image/svg+xml');
    expect(contentTypeFor('a.bin')).toBe('application/octet-stream');
  });
});

describe('S3StorageService (fake client)', () => {
  function setup() {
    const sent: PutObjectCommand[] = [];
    const service = new S3StorageService({
      client: { send: async (cmd) => { sent.push(cmd); return {}; } },
      bucket: 'merch-prints',
      publicBaseUrl: 'http://localhost:9000/',
      idGenerator: () => 'abc',
    });
    return { sent, service };
  }

  it('uploadPrintOriginal кладе об\u02bcєкт у bucket і повертає публічний URL', async () => {
    const { sent, service } = setup();
    const url = await service.uploadPrintOriginal('logo.png', new Uint8Array([1, 2, 3]));
    expect(url).toBe('http://localhost:9000/merch-prints/prints/abc-logo.png');
    expect(sent[0]?.input).toMatchObject({ Bucket: 'merch-prints', Key: 'prints/abc-logo.png', ContentType: 'image/png' });
    expect(sent[0]?.input.Body).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('uploadPreview використовує префікс previews', async () => {
    const { sent, service } = setup();
    const url = await service.uploadPreview('p1.svg', new Uint8Array([9]));
    expect(url).toContain('/previews/abc-p1.svg');
    expect(sent[0]?.input.ContentType).toBe('image/svg+xml');
  });

  it('негатив: помилка S3 прокидається нагору', async () => {
    const service = new S3StorageService({
      client: { send: async () => { throw new Error('S3 down'); } },
      bucket: 'b',
      publicBaseUrl: 'http://x',
    });
    await expect(service.uploadPreview('a.svg', new Uint8Array())).rejects.toThrow('S3 down');
  });
});

describe('LocalDiskStorageService', () => {
  let dir = '';
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('пише файл на диск і повертає URL', async () => {
    dir = await mkdtemp(join(tmpdir(), 'merch-'));
    const service = new LocalDiskStorageService({ rootDir: dir, publicBaseUrl: 'http://localhost:3000/files/', idGenerator: () => 'id1' });
    const url = await service.uploadPrintOriginal('a.png', new Uint8Array([7, 8]));
    expect(url).toBe('http://localhost:3000/files/prints/id1-a.png');
    expect([...(await readFile(join(dir, 'prints/id1-a.png')))]).toEqual([7, 8]);
  });
});
