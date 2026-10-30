import express, { type Express } from 'express';
import { createCatalogModule } from './modules/catalog';
import { createCustomizerModule } from './modules/customizer';
import { createDeliveryModule } from './modules/delivery';
import { createNotificationModule } from './modules/notification';
import { createOrderModule } from './modules/order';
import { createPaymentModule } from './modules/payment';
import type { AppDependencies } from './infra/config/container';
import { cors } from './infra/http/cors';
import { errorHandler } from './infra/http/error-handler';

/** Composition root: збирає модулі й підписує спостерігачів на замовлення. */
export function createApp(deps: AppDependencies) {
  const app: Express = express();
  app.disable('x-powered-by');
  app.use(cors(deps.corsOrigin));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  if (deps.localUploadsDir) {
    app.use(
      '/files',
      express.static(deps.localUploadsDir, {
        dotfiles: 'deny',
        setHeaders: (res) => {
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Content-Security-Policy', "default-src 'none'; img-src * data:");
        },
      }),
    );
  }

  const catalog = createCatalogModule({ catalogRepo: deps.catalogRepo });
  const customizer = createCustomizerModule({
    catalogRepo: deps.catalogRepo,
    productRepo: deps.productRepo,
    storage: deps.storage,
  });
  const payment = createPaymentModule({ strategy: deps.paymentStrategy });
  const order = createOrderModule({
    orderRepo: deps.orderRepo,
    productRepo: deps.productRepo,
    deliveryService: deps.deliveryService,
    paymentProcessor: payment.processor,
  });
  const delivery = createDeliveryModule({
    deliveryService: deps.deliveryService,
    recipientProvider: deps.recipientProvider,
    ttnStore: {
      get: (orderId) => order.service.getTtnNumber(orderId),
      save: (orderId, ttn) => order.service.setTtnNumber(orderId, ttn),
    },
  });
  const notification = createNotificationModule({
    sender: deps.notificationSender,
    orderProvider: (orderId) => order.service.getOrder(orderId),
    describeItem: async (customProductId) => {
      const product = await deps.productRepo.findById(customProductId);
      if (!product) return null;
      const base = product.getBaseItem();
      return `${base.getTitle()}, ${base.getColor()}, ${base.getSize()}`;
    },
    ...(deps.appUrl && { orderUrl: (orderId: string) => `${deps.appUrl}/orders/${orderId}` }),
  });

  // порядок важливий: спершу доставка (дописує ТТН), потім лист клієнту з цим номером
  order.attach(delivery.observer);
  order.attach(notification.observer);

  app.use(catalog.router);
  app.use(customizer.router);
  app.use(delivery.router);
  app.use(order.router);

  app.use(errorHandler);
  return { app, modules: { catalog, customizer, delivery, payment, order, notification } };
}
