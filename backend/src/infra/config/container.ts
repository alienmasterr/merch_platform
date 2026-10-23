import { resolve } from 'node:path';
import { S3Client } from '@aws-sdk/client-s3';
import nodemailer from 'nodemailer';
import pg from 'pg';
import {
  NotFoundError,
  type DeliveryRecipient,
  type ICatalogRepository,
  type ICustomMerchRepository,
  type IDeliveryService,
  type INotificationSender,
  type IOrderRepository,
  type IPaymentStrategy,
  type IStorageService,
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
import { ConsoleNotificationSender } from '../../modules/notification/infrastructure/console-notification-sender';
import { SmtpNotificationSender } from '../../modules/notification/infrastructure/smtp-notification-sender';
import { InMemoryOrderRepository } from '../../modules/order/infrastructure/in-memory-order-repository';
import { PostgresOrderRepository } from '../../modules/order/infrastructure/postgres-order-repository';
import { FetchFormHttpClient } from '../../modules/payment/infrastructure/form-http-client';
import { LiqPayPaymentStrategy } from '../../modules/payment/infrastructure/liqpay-payment-strategy';
import { StubPaymentStrategy } from '../../modules/payment/infrastructure/stub-payment-strategy';
import type { AppConfig } from './config';

export interface AppDependencies {
  catalogRepo: ICatalogRepository;
  productRepo: ICustomMerchRepository;
  storage: IStorageService;
  deliveryService: IDeliveryService;
  orderRepo: IOrderRepository;
  paymentStrategy: IPaymentStrategy;
  notificationSender: INotificationSender;
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
  let orderRepo: IOrderRepository;
  let close: () => Promise<void> = async () => {};

  if (config.PERSISTENCE === 'postgres') {
    const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
    catalogRepo = new PostgresCatalogRepository(pool);
    productRepo = new PostgresCustomMerchRepository(pool, catalogRepo);
    orderRepo = new PostgresOrderRepository(pool);
    close = () => pool.end();
  } else {
    catalogRepo = new InMemoryCatalogRepository();
    productRepo = new InMemoryCustomMerchRepository();
    orderRepo = new InMemoryOrderRepository();
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

  const paymentStrategy: IPaymentStrategy =
    config.LIQPAY_PUBLIC_KEY && config.LIQPAY_PRIVATE_KEY
      ? new LiqPayPaymentStrategy({
          publicKey: config.LIQPAY_PUBLIC_KEY,
          privateKey: config.LIQPAY_PRIVATE_KEY,
          sandbox: config.LIQPAY_SANDBOX,
          http: new FetchFormHttpClient(),
          resultUrl: config.PAYMENT_RESULT_URL,
          serverUrl: `${config.PUBLIC_BASE_URL}/payments/webhook`,
        })
      : new StubPaymentStrategy(config.PAYMENT_RESULT_URL);

  const notificationSender: INotificationSender = config.SMTP_HOST
    ? new SmtpNotificationSender(
        nodemailer.createTransport({
          host: config.SMTP_HOST,
          port: config.SMTP_PORT,
          secure: config.SMTP_SECURE,
          ...(config.SMTP_USER && { auth: { user: config.SMTP_USER, pass: config.SMTP_PASS ?? '' } }),
        }),
        config.MAIL_FROM,
      )
    : new ConsoleNotificationSender();

  return {
    close,
    deps: {
      catalogRepo,
      productRepo,
      storage,
      deliveryService,
      orderRepo,
      paymentStrategy,
      notificationSender,
      recipientProvider: async (orderId) => {
        const order = await orderRepo.findById(orderId);
        if (!order) throw new NotFoundError(`Order ${orderId} not found`);
        return order.recipient;
      },
      ...(localUploadsDir && { localUploadsDir }),
      corsOrigin: config.CORS_ORIGIN,
    },
  };
}
