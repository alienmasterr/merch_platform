import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import type { IStorageService } from '@merch/contracts';
import { buildStorageKey, contentTypeFor } from './storage-keys';

/** Мінімум від S3Client, що нам потрібен (легко підмінити в тестах). */
export interface S3ClientLike {
  send(command: PutObjectCommand): Promise<unknown>;
}

export interface S3StorageOptions {
  client: S3ClientLike;
  bucket: string;
  /** Базовий публічний URL сховища, напр. http://localhost:9000 (результат: {base}/{bucket}/{key}). */
  publicBaseUrl: string;
  idGenerator?: () => string;
}

export class S3StorageService implements IStorageService {
  private readonly client: S3ClientLike;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly idGenerator: () => string;

  constructor(options: S3StorageOptions) {
    this.client = options.client;
    this.bucket = options.bucket;
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
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentTypeFor(fileName),
      }),
    );
    return `${this.publicBaseUrl}/${this.bucket}/${key}`;
  }
}
