import { vi, type Mock } from 'vitest';
import {
  PaymentStatus,
  type ICustomMerchProduct,
  type ICustomMerchRepository,
  type IDeliveryService,
  type IPaymentProcessor,
  type MerchApparelItem,
} from '@merch/contracts';
import { OrderService } from '../application/order-service';
import { InMemoryOrderRepository } from '../infrastructure/in-memory-order-repository';

/** Fake кастомного виробу: order-модуль знає лише інтерфейс ICustomMerchProduct. */
export function fakeProduct(id: string, totalCost: number): ICustomMerchProduct {
  let approved = false;
  return {
    getId: () => id,
    getBaseItem: () => ({}) as MerchApparelItem,
    getPrintConfigs: () => [],
    getPreviewImageUrl: () => `http://x/${id}.svg`,
    isMockupApproved: () => approved,
    getTotalCost: () => totalCost,
    setPreviewImageUrl: () => {},
    setApprovalStatus: (v: boolean) => {
      approved = v;
    },
  };
}

export class FakeProductRepo implements ICustomMerchRepository {
  readonly products = new Map<string, ICustomMerchProduct>();
  readonly saved: string[] = [];

  constructor(...products: ICustomMerchProduct[]) {
    for (const p of products) this.products.set(p.getId(), p);
  }

  async save(product: ICustomMerchProduct): Promise<void> {
    this.saved.push(product.getId());
    this.products.set(product.getId(), product);
  }

  async findById(id: string): Promise<ICustomMerchProduct | null> {
    return this.products.get(id) ?? null;
  }
}

export type FakePayments = { [K in keyof IPaymentProcessor]: Mock<IPaymentProcessor[K]> };

export function fakePayments(): FakePayments {
  return {
    setStrategy: vi.fn<IPaymentProcessor['setStrategy']>(),
    initiatePayment: vi.fn<IPaymentProcessor['initiatePayment']>(async (r) => ({ ...r, checkoutUrl: 'https://pay/x', data: 'd', signature: 's' })),
    handleWebhookNotification: vi.fn<IPaymentProcessor['handleWebhookNotification']>(async (p) => ({
      orderId: String(p.orderId),
      status: (p.status as PaymentStatus | undefined) ?? PaymentStatus.SUCCESS,
      amount: Number(p.amount),
      currency: 'UAH',
      transactionId: 'tx-1',
    })),
    refund: vi.fn<IPaymentProcessor['refund']>(async () => {}),
  };
}

export const validRecipient = {
  fullName: 'Шевченко Тарас',
  phone: '+38 (050) 123-45-67',
  email: 'taras@example.com',
  city: 'Київ',
  warehouse: '12',
};

export function setupService() {
  const orderRepo = new InMemoryOrderRepository();
  const productRepo = new FakeProductRepo(fakeProduct('p1', 500), fakeProduct('p2', 250));
  const delivery: IDeliveryService = {
    calculateShippingCost: vi.fn(async () => 70),
    generateTTN: vi.fn(async (orderId: string) => `TTN-${orderId}`),
  };
  const payments = fakePayments();
  const logError = vi.fn();
  let n = 0;
  const service = new OrderService({
    orderRepo,
    productRepo,
    deliveryService: delivery,
    paymentProcessor: payments,
    idGenerator: () => `order-${++n}`,
    now: () => new Date('2026-10-22T10:00:00Z'),
    logError,
  });
  return { service, orderRepo, productRepo, delivery, payments, logError };
}
