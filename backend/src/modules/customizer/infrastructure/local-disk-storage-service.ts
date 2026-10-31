import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { IStorageService } from '@merch/contracts';
import { buildStorageKey } from './storage-keys';

export interface LocalDiskStorageOptions {
  rootDir: string;
  publicBaseUrl: string;
  idGenerator?: () => string;
}

export class LocalDiskStorageService implements IStorageService {
  private readonly rootDir: string;
  private readonly publicBaseUrl: string;
  private readonly idGenerator: () => string;

  constructor(options: LocalDiskStorageOptions) {
    this.rootDir = options.rootDir;
    this.publicBaseUrl = options.publicBaseUrl.replace(/\/$/, '');
    this.idGenerator = options.idGenerator ?? randomUUID;
  }

  uploadPrintOriginal(fileName: string, fileData: Uint8Array): Promise<string> {
    return this.put('prints', fileName, fileData);
  }

  uploadPreview(fileName: string, previewData: Uint8Array): Promise<string> {
    return this.put('previews', fileName, previewData);
  }

  private async put(prefix: string, fileName: string, data: Uint8Array): Promise<string> {
    const key = buildStorageKey(prefix, fileName, this.idGenerator());
    const target = join(this.rootDir, key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
    return `${this.publicBaseUrl}/${key}`;
  }
}
