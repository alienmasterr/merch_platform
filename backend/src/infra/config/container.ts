import { resolve } from 'node:path';
import { S3Client } from '@aws-sdk/client-s3';
import pg from 'pg';
import type {
  DeliveryRecipient,
  ICatalogRepository,
  ICustomMerchRepository,
  IDeliveryService,
  IStorageService,
} from '@merch/contracts';
import { InMemoryCatalogRepository } from '../../modules/catalog/infrastructure/in-memory-catalog-repository';
import { PostgresCatalogRepository } from '../../modules/catalog/infrastructure/postgres-catalog-repository';
import { seedCatalog } from '../../modules/catalog/infrastructure/dev-seed';
import { InMemoryCustomMerchRepository } from '../../modules/customizer/infrastructure/in-memory-custom-merch-repository';
import { InMemoryStorageService } from '../../modules/customizer/infrastructure/in-memory-storage-service';
import { LocalDiskStorageService } from '../../modules/customizer/infrastructure/local-disk-storage-service';
import { PostgresCustomMerchRepository } from '../../modules/customizer/infrastructure/postgres-custom-merch-repository';
import { S3StorageService } from '../../modules/customizer/infrastructure/s3-storage-service';
import { FetchHttpClient } from '../../modules/delivery/infrastructure/http-client';
import { NovaPoshtaDeliveryService } from '../../modules/delivery/infrastructure/nova-poshta-delivery-service';
import { StubDeliveryService } from '../../modules/delivery/infrastructure/stub-delivery-service';
import type { AppConfig } from './config';

export interface AppDependencies {
  catalogRepo: ICatalogRepository;
  productRepo: ICustomMerchRepository;
  storage: IStorageService;
  deliveryService: IDeliveryService;
  /** Як дістати отримувача за orderId (потрібно NovaPoshtaDeliveryObserver). */
  recipientProvider: (orderId: string) => Promise<DeliveryRecipient>;
  /** Якщо задано, Express віддає цю папку на /files (локальне сховище). */
  localUploadsDir?: string;
  corsOrigin: string;
}

export interface Container {
  deps: AppDependencies;
  close(): Promise<void>;
}

/** Єдине місце, яке знає про конкретні реалізації. Решта коду залежить від інтерфейсів. */
export async function buildContainer(config: AppConfig): Promise<Container> {
  let catalogRepo: ICatalogRepository;
  let productRepo: ICustomMerchRepository;
  let close: () => Promise<void> = async () => {};

  if (config.PERSISTENCE === 'postgres') {
    const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
    catalogRepo = new PostgresCatalogRepository(pool);
    productRepo = new PostgresCustomMerchRepository(pool, catalogRepo);
    close = () => pool.end();
  } else {
    catalogRepo = new InMemoryCatalogRepository();
    productRepo = new InMemoryCustomMerchRepository();
    await seedCatalog(catalogRepo);
  }

  let storage: IStorageService;
  let localUploadsDir: string | undefined;
  if (config.STORAGE_DRIVER === 's3') {
    const client = new S3Client({
      region: config.S3_REGION,
      endpoint: config.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: { accessKeyId: config.S3_ACCESS_KEY ?? '', secretAccessKey: config.S3_SECRET_KEY ?? '' },
    });
    storage = new S3StorageService({
      client,
      bucket: config.S3_BUCKET,
      publicBaseUrl: config.S3_PUBLIC_URL ?? config.S3_ENDPOINT ?? '',
    });
  } else if (config.STORAGE_DRIVER === 'local') {
    localUploadsDir = resolve(config.UPLOADS_DIR);
    storage = new LocalDiskStorageService({
      rootDir: localUploadsDir,
      publicBaseUrl: `${config.PUBLIC_BASE_URL}/files`,
    });
  } else {
    storage = new InMemoryStorageService();
  }

  const deliveryService: IDeliveryService = config.NOVA_POSHTA_API_KEY
    ? new NovaPoshtaDeliveryService({
        apiKey: config.NOVA_POSHTA_API_KEY,
        http: new FetchHttpClient(),
        sender: {
          cityName: config.NP_SENDER_CITY,
          senderRef: config.NP_SENDER_REF ?? '',
          contactSenderRef: config.NP_CONTACT_SENDER_REF ?? '',
          senderAddressRef: config.NP_SENDER_ADDRESS_REF ?? '',
          phone: config.NP_SENDER_PHONE ?? '',
        },
      })
    : new StubDeliveryService();

  return {
    close,
    deps: {
      catalogRepo,
      productRepo,
      storage,
      deliveryService,
      // TODO(C): після появи Order-модуля замінити на пошук отримувача в IOrderRepository.
      recipientProvider: async () => {
        throw new Error('Order module is not wired yet: provide recipientProvider in container.ts');
      },
      ...(localUploadsDir && { localUploadsDir }),
      corsOrigin: config.CORS_ORIGIN,
    },
  };
}
