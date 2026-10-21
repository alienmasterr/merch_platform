import type { IDeliveryService } from '@merch/contracts';
import {
  NovaPoshtaDeliveryObserver,
  type RecipientProvider,
} from './application/nova-poshta-delivery-observer';
import { createDeliveryRouter } from './infrastructure/delivery-router';

export interface DeliveryModuleDeps {
  deliveryService: IDeliveryService;
  recipientProvider: RecipientProvider;
}

export function createDeliveryModule(deps: DeliveryModuleDeps) {
  const observer = new NovaPoshtaDeliveryObserver(deps.deliveryService, deps.recipientProvider);
  const router = createDeliveryRouter(deps.deliveryService);
  return { service: deps.deliveryService, observer, router };
}
