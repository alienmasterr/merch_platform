import type {
  ICustomMerchRepository,
  IDeliveryService,
  IOrderObserver,
  IOrderRepository,
  IPaymentProcessor,
} from '@merch/contracts';
import { OrderService } from './application/order-service';
import { createOrderRouter } from './infrastructure/order-router';

export interface OrderModuleDeps {
  orderRepo: IOrderRepository;
  productRepo: ICustomMerchRepository;
  deliveryService: IDeliveryService;
  paymentProcessor: IPaymentProcessor;
  idGenerator?: () => string;
  now?: () => Date;
  logError?: (message: string) => void;
}

export function createOrderModule(deps: OrderModuleDeps) {
  const service = new OrderService(deps);
  const router = createOrderRouter(service);
  return {
    service,
    router,
    /** Підписати спостерігача на зміни статусу всіх замовлень (порядок підписки = порядок сповіщення). */
    attach: (observer: IOrderObserver) => service.attach(observer),
  };
}
