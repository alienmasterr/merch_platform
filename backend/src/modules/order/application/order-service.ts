import { randomUUID } from 'node:crypto';
import {
  ConflictError,
  NotFoundError,
  OrderStatus,
  PaymentStatus,
  ValidationError,
  type ICustomMerchRepository,
  type IDeliveryService,
  type IOrderObserver,
  type IOrderRepository,
  type IPaymentProcessor,
  type OrderData,
  type PaymentInvoice,
  type RecipientDetails,
} from '@merch/contracts';
import { ObserverNotificationError, Order } from '../domain/order';
import { PAID_STATUSES } from '../domain/order-transitions';
import { createRecipientDetails } from '../domain/recipient-details';

export const WEIGHT_PER_ITEM_KG = 0.5;

export interface OrderServiceDeps {
  orderRepo: IOrderRepository;
  productRepo: ICustomMerchRepository;
  deliveryService: IDeliveryService;
  paymentProcessor: IPaymentProcessor;
  idGenerator?: () => string;
  now?: () => Date;
  logError?: (message: string) => void;
}

export interface CreateOrderRequest {
  items: { customProductId: string; quantity: number }[];
  recipient: RecipientDetails;
}

export interface OrderActionResult {
  order: OrderData;
  warnings: string[];
}

export class OrderService {
  private readonly orderRepo: IOrderRepository;
  private readonly productRepo: ICustomMerchRepository;
  private readonly deliveryService: IDeliveryService;
  private readonly payments: IPaymentProcessor;
  private readonly idGenerator: () => string;
  private readonly now: () => Date;
  private readonly logError: (message: string) => void;
  private readonly observers: IOrderObserver[] = [];

  constructor(deps: OrderServiceDeps) {
    this.orderRepo = deps.orderRepo;
    this.productRepo = deps.productRepo;
    this.deliveryService = deps.deliveryService;
    this.payments = deps.paymentProcessor;
    this.idGenerator = deps.idGenerator ?? randomUUID;
    this.now = deps.now ?? (() => new Date());
    this.logError = deps.logError ?? ((m) => console.error(m));
  }

  attach(observer: IOrderObserver): void {
    if (!this.observers.includes(observer)) this.observers.push(observer);
  }

  detach(observer: IOrderObserver): void {
    const i = this.observers.indexOf(observer);
    if (i >= 0) this.observers.splice(i, 1);
  }

  async createOrder(request: CreateOrderRequest): Promise<OrderData> {
    if (request.items.length === 0) throw new ValidationError('Order must contain at least one item');
    const recipient = createRecipientDetails(request.recipient);

    const items = [];
    for (const { customProductId, quantity } of request.items) {
      const product = await this.productRepo.findById(customProductId);
      if (!product) throw new NotFoundError(`Custom product ${customProductId} not found`);
      items.push({ customProductId, quantity, unitPrice: product.getTotalCost() });
    }

    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const shippingCost = await this.deliveryService.calculateShippingCost(recipient.city, totalQty * WEIGHT_PER_ITEM_KG);

    const order = Order.create({ id: this.idGenerator(), items, recipient, shippingCost, createdAt: this.now() });
    await this.orderRepo.save(order.toData());
    return order.toData();
  }

  async getOrder(id: string): Promise<OrderData> {
    return (await this.load(id)).toData();
  }

  listByStatus(status: OrderStatus): Promise<OrderData[]> {
    return this.orderRepo.findByStatus(status);
  }

  async getRecipient(orderId: string): Promise<RecipientDetails> {
    return (await this.load(orderId)).getRecipient();
  }

  async checkout(orderId: string): Promise<PaymentInvoice> {
    const order = await this.load(orderId);
    if (order.getStatus() !== OrderStatus.CREATED) {
      throw new ConflictError(`Order ${orderId} is ${order.getStatus()} and cannot be paid`);
    }
    return this.payments.initiatePayment({
      orderId,
      amount: order.calculateTotal(),
      currency: 'UAH',
      description: `Merch Platform, замовлення ${orderId}`,
    });
  }

  async handlePaymentWebhook(payload: Record<string, unknown>): Promise<void> {
    const notification = await this.payments.handleWebhookNotification(payload);
    if (notification.status !== PaymentStatus.SUCCESS) return;

    const order = await this.load(notification.orderId);
    if (notification.currency !== 'UAH' || Math.abs(notification.amount - order.calculateTotal()) > 0.009) {
      throw new ConflictError(
        `Payment ${notification.amount} ${notification.currency} does not match order total ${order.calculateTotal()} UAH`,
      );
    }
    await this.handlePaymentSuccess(notification.orderId, notification.transactionId);
  }

  async handlePaymentSuccess(orderId: string, transactionId: string | null): Promise<OrderActionResult> {
    const order = await this.load(orderId);
    if (order.getStatus() !== OrderStatus.CREATED) return { order: order.toData(), warnings: [] };

    order.setPaymentTransactionId(transactionId);
    const warnings = [
      ...(await this.applyStatus(order, OrderStatus.PAID)),
      ...(await this.applyStatus(order, OrderStatus.PENDING_REVIEW)),
    ];
    return { order: (await this.load(orderId)).toData(), warnings };
  }

  async verifyMockup(orderId: string, approved: boolean): Promise<OrderActionResult> {
    const order = await this.load(orderId);
    if (order.getStatus() !== OrderStatus.PENDING_REVIEW) {
      throw new ConflictError(`Order ${orderId} is ${order.getStatus()}, mockup can be verified only in PENDING_REVIEW`);
    }
    const result = approved ? null : await this.cancel(order);
    await this.markMockups(order.toData(), approved);
    if (result) return result;
    const warnings = await this.applyStatus(order, OrderStatus.PRINTING);
    return { order: (await this.load(orderId)).toData(), warnings };
  }

  async changeStatus(orderId: string, status: OrderStatus): Promise<OrderActionResult> {
    const order = await this.load(orderId);
    if (status === OrderStatus.CANCELLED) return this.cancel(order);
    if (status === OrderStatus.PAID || status === OrderStatus.PENDING_REVIEW) {
      throw new ConflictError(`Status ${status} is set only by a payment notification`);
    }
    if (status === OrderStatus.PRINTING) {
      throw new ConflictError('Use mockup verification to send the order to printing');
    }
    const warnings = await this.applyStatus(order, status);
    return { order: (await this.load(orderId)).toData(), warnings };
  }

  async retryNotifications(orderId: string): Promise<OrderActionResult> {
    const order = await this.load(orderId);
    const warnings = await this.notify(order);
    return { order: (await this.load(orderId)).toData(), warnings };
  }

  async getTtnNumber(orderId: string): Promise<string | null> {
    return (await this.load(orderId)).toData().ttnNumber;
  }

  async setTtnNumber(orderId: string, ttn: string): Promise<void> {
    const order = await this.load(orderId);
    order.setTtnNumber(ttn);
    await this.orderRepo.save(order.toData());
  }

  private async markMockups(order: OrderData, approved: boolean): Promise<void> {
    for (const item of order.items) {
      const product = await this.productRepo.findById(item.customProductId);
      if (!product) throw new NotFoundError(`Custom product ${item.customProductId} not found`);
      product.setApprovalStatus(approved);
      await this.productRepo.save(product);
    }
  }

  private async cancel(order: Order): Promise<OrderActionResult> {
    if (!order.canTransitionTo(OrderStatus.CANCELLED)) {
      throw new ConflictError(`Order ${order.getId()} cannot be cancelled in status ${order.getStatus()}`);
    }
    if (PAID_STATUSES.has(order.getStatus())) {
      await this.payments.refund(order.getId(), order.calculateTotal());
    }
    const warnings = await this.applyStatus(order, OrderStatus.CANCELLED);
    return { order: (await this.load(order.getId())).toData(), warnings };
  }

  private async applyStatus(order: Order, status: OrderStatus): Promise<string[]> {
    order.transitionTo(status);
    await this.orderRepo.save(order.toData());
    return this.notify(order);
  }

  private async notify(order: Order): Promise<string[]> {
    for (const observer of this.observers) order.attach(observer);
    try {
      await order.notifyObservers();
      return [];
    } catch (e) {
      if (!(e instanceof ObserverNotificationError)) throw e;
      const warnings = e.failures.map((f) => f.message);
      for (const w of warnings) this.logError(`Order ${order.getId()} (${order.getStatus()}): observer failed: ${w}`);
      return warnings;
    }
  }

  private async load(id: string): Promise<Order> {
    const data = await this.orderRepo.findById(id);
    if (!data) throw new NotFoundError(`Order ${id} not found`);
    return Order.fromData(data);
  }
}
