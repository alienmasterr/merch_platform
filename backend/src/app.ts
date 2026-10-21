import express, { type Express } from 'express';
import { createCatalogModule } from './modules/catalog';
import { createCustomizerModule } from './modules/customizer';
import { createDeliveryModule } from './modules/delivery';
import type { AppDependencies } from './infra/config/container';
import { cors } from './infra/http/cors';
import { errorHandler } from './infra/http/error-handler';

/** Composition root: збирає модулі. Модулі C (order/payment/notification) підключаються тут же. */
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
  const delivery = createDeliveryModule({
    deliveryService: deps.deliveryService,
    recipientProvider: deps.recipientProvider,
  });

  app.use(catalog.router);
  app.use(customizer.router);
  app.use(delivery.router);

  // TODO(C): app.use(order.router); app.use(payment.router);
  //          order.attach(delivery.observer) тощо. Спостерігачі підписуються на Order тут.

  app.use(errorHandler);
  return { app, modules: { catalog, customizer, delivery } };
}
