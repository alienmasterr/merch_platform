import { randomUUID } from 'node:crypto';
import type { IStorageService } from '@merch/contracts';
import { buildStorageKey } from './storage-keys';

/** Для тестів і запуску без диска/S3. */
export class InMemoryStorageService implements IStorageService {
  readonly files = new Map<string, Uint8Array>();
  private readonly idGenerator: () => string;

  constructor(idGenerator: () => string = randomUUID) {
    this.idGenerator = idGenerator;
  }

  async uploadPrintOriginal(fileName: string, fileData: Uint8Array): Promise<string> {
    return this.put('prints', fileName, fileData);
  }

  async uploadPreview(fileName: string, previewData: Uint8Array): Promise<string> {
    return this.put('previews', fileName, previewData);
  }

  private put(prefix: string, fileName: string, data: Uint8Array): string {
    const key = buildStorageKey(prefix, fileName, this.idGenerator());
    this.files.set(key, data);
    return `http://memory.local/${key}`;
  }
}
