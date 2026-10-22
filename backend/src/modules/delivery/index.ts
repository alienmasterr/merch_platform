import type { IDeliveryService } from '@merch/contracts';
import {
  NovaPoshtaDeliveryObserver,
  type RecipientProvider,
  type TtnStore,
} from './application/nova-poshta-delivery-observer';
import { createDeliveryRouter } from './infrastructure/delivery-router';

export interface DeliveryModuleDeps {
  deliveryService: IDeliveryService;
  recipientProvider: RecipientProvider;
  ttnStore?: TtnStore;
}

export function createDeliveryModule(deps: DeliveryModuleDeps) {
  const observer = new NovaPoshtaDeliveryObserver(deps.deliveryService, deps.recipientProvider, deps.ttnStore);
  const router = createDeliveryRouter(deps.deliveryService);
  return { service: deps.deliveryService, observer, router };
}
