import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL } from '../api/client';
import type {
  CreateOrderRequest,
  CustomProduct,
  Order,
  PrintConfigurationInput,
} from '../api/types';
import { estimatePrintCost } from '../features/customizer/placement';
import { categories, catalogItems } from './fixtures';

/** Повна адреса ендпоїнта для MSW-обробників. */
export const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;

const notFound = (what: string) =>
  HttpResponse.json({ error: 'NOT_FOUND', message: `${what} not found` }, { status: 404 });

const forbidden = (role: string) =>
  HttpResponse.json({ error: 'FORBIDDEN', message: `Role "${role}" is required` }, { status: 403 });

/** Збережені в "бекенді" кастомні вироби та замовлення (скидаються між тестами). */
export const customProducts = new Map<string, CustomProduct>();
export const orders = new Map<string, Order>();

export const SHIPPING_COST = 70;

const NEXT: Record<Order['status'], Order['status'][]> = {
  CREATED: ['PAID', 'CANCELLED'],
  PAID: ['PENDING_REVIEW', 'CANCELLED'],
  PENDING_REVIEW: ['PRINTING', 'CANCELLED'],
  PRINTING: ['SHIPPED'],
  SHIPPED: [],
  CANCELLED: [],
};

/** Замовлення з тими самими полями, що повертає бекенд (orderToDto). */
export function buildOrder(
  id: string,
  request: CreateOrderRequest,
  status: Order['status'] = 'CREATED',
): Order {
  const items = request.items.map((i) => {
    const unitPrice = customProducts.get(i.customProductId)?.totalCost ?? 100;
    const quantity = i.quantity ?? 1;
    return {
      customProductId: i.customProductId,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });
  const itemsTotal = items.reduce((s, i) => s + i.lineTotal, 0);
  return {
    id,
    status,
    allowedNextStatuses: NEXT[status],
    items,
    recipient: request.recipient,
    shippingCost: SHIPPING_COST,
    total: Math.round((itemsTotal + SHIPPING_COST) * 100) / 100,
    currency: 'UAH',
    ttnNumber: null,
    paymentTransactionId: null,
    createdAt: '2026-10-23T10:00:00.000Z',
  };
}

export function withStatus(
  order: Order,
  status: Order['status'],
  patch: Partial<Order> = {},
): Order {
  return { ...order, status, allowedNextStatuses: NEXT[status], ...patch };
}

export function buildCustomProduct(
  id: string,
  baseItemId: string,
  prints: PrintConfigurationInput[],
): CustomProduct {
  const baseItem = catalogItems.find((i) => i.id === baseItemId);
  if (!baseItem) throw new Error(`fixture ${baseItemId} not found`);
  const full = prints.map((p) => {
    const geometry = {
      ...p,
      offsetX: p.offsetX ?? 0,
      offsetY: p.offsetY ?? 0,
      scale: p.scale ?? 1,
    };
    return { ...geometry, printCost: estimatePrintCost(geometry, p.technology) };
  });
  const total =
    baseItem.basePrice + baseItem.productionCost + full.reduce((s, p) => s + p.printCost, 0);
  return {
    id,
    baseItem,
    prints: full,
    previewImageUrl: `http://localhost:3000/files/previews/${id}.svg`,
    mockupApproved: false,
    totalCost: Math.round(total * 100) / 100,
  };
}

/** Обробники за замовчуванням. Окремі тести перевизначають їх через server.use(...). */
export const defaultHandlers = [
  http.get(apiUrl('/health'), () => HttpResponse.json({ status: 'ok' })),
  http.get(apiUrl('/catalog/categories'), () => HttpResponse.json(categories)),
  http.get(apiUrl('/catalog'), ({ request }) => {
    const inStockOnly = new URL(request.url).searchParams.get('inStockOnly') === 'true';
    return HttpResponse.json(inStockOnly ? catalogItems.filter((i) => i.inStock) : catalogItems);
  }),
  http.get(apiUrl('/catalog/:id'), ({ params }) => {
    const item = catalogItems.find((i) => i.id === params.id);
    return item ? HttpResponse.json(item) : notFound(`Product ${String(params.id)}`);
  }),

  http.post(apiUrl('/admin/catalog'), async ({ request }) => {
    if (request.headers.get('x-user-role') !== 'admin') return forbidden('admin');
    const body = (await request.json()) as Record<string, unknown>;
    const category = categories.find((c) => c.id === body.categoryId);
    if (!category) return notFound(`Category ${String(body.categoryId)}`);
    const { categoryId: _ignored, ...rest } = body;
    const item = {
      ...rest,
      id: `new-${catalogItems.length}`,
      category,
      productionCost: 30,
      allowedPlacements: ['CHEST'],
    };
    return HttpResponse.json(item, { status: 201 });
  }),
  http.patch(apiUrl('/admin/catalog/:id'), async ({ request, params }) => {
    if (request.headers.get('x-user-role') !== 'admin') return forbidden('admin');
    const item = catalogItems.find((i) => i.id === params.id);
    if (!item) return notFound(`Product ${String(params.id)}`);
    return HttpResponse.json({ ...item, ...((await request.json()) as object) });
  }),

  http.post(apiUrl('/customizer/uploads'), async ({ request }) => {
    const file = (await request.formData()).get('file');
    const name = file instanceof File ? file.name : 'file';
    return HttpResponse.json(
      { printFileUrl: `http://localhost:3000/files/prints/${name}` },
      { status: 201 },
    );
  }),
  http.post(apiUrl('/customizer/products'), async ({ request }) => {
    const body = (await request.json()) as {
      baseItemId: string;
      prints: PrintConfigurationInput[];
    };
    const product = buildCustomProduct(
      `cp-${customProducts.size + 1}`,
      body.baseItemId,
      body.prints,
    );
    customProducts.set(product.id, product);
    return HttpResponse.json(product, { status: 201 });
  }),
  http.get(apiUrl('/customizer/products/:id'), ({ params }) => {
    const product = customProducts.get(String(params.id));
    return product ? HttpResponse.json(product) : notFound(`Custom product ${String(params.id)}`);
  }),

  http.get(apiUrl('/delivery/shipping-cost'), ({ request }) => {
    const params = new URL(request.url).searchParams;
    return HttpResponse.json({
      city: params.get('city'),
      weightKg: Number(params.get('weightKg')),
      cost: SHIPPING_COST,
      currency: 'UAH',
    });
  }),
  http.post(apiUrl('/orders'), async ({ request }) => {
    const order = buildOrder(
      `order-${orders.size + 1}`,
      (await request.json()) as CreateOrderRequest,
    );
    orders.set(order.id, order);
    return HttpResponse.json(order, { status: 201 });
  }),
  http.get(apiUrl('/orders/:id'), ({ params }) => {
    const order = orders.get(String(params.id));
    return order ? HttpResponse.json(order) : notFound(`Order ${String(params.id)}`);
  }),
  http.post(apiUrl('/orders/:id/checkout'), ({ params }) => {
    const order = orders.get(String(params.id));
    if (!order) return notFound(`Order ${String(params.id)}`);
    return HttpResponse.json({
      orderId: order.id,
      amount: order.total,
      currency: 'UAH',
      checkoutUrl: `http://localhost:5173/payment-result?orderId=${order.id}`,
      data: 'ZGF0YQ==',
      signature: 'c2ln',
    });
  }),
  http.get(apiUrl('/manager/orders'), ({ request }) => {
    if (request.headers.get('x-user-role') !== 'manager') return forbidden('manager');
    const status = new URL(request.url).searchParams.get('status') ?? 'PENDING_REVIEW';
    return HttpResponse.json([...orders.values()].filter((o) => o.status === status));
  }),
  http.post(apiUrl('/manager/orders/:id/verify-mockup'), async ({ request, params }) => {
    if (request.headers.get('x-user-role') !== 'manager') return forbidden('manager');
    const order = orders.get(String(params.id));
    if (!order) return notFound(`Order ${String(params.id)}`);
    const { approved } = (await request.json()) as { approved: boolean };
    const next = withStatus(order, approved ? 'PRINTING' : 'CANCELLED');
    orders.set(next.id, next);
    return HttpResponse.json({ ...next, warnings: [] });
  }),
  http.patch(apiUrl('/manager/orders/:id/status'), async ({ request, params }) => {
    if (request.headers.get('x-user-role') !== 'manager') return forbidden('manager');
    const order = orders.get(String(params.id));
    if (!order) return notFound(`Order ${String(params.id)}`);
    const { status } = (await request.json()) as { status: Order['status'] };
    const next = withStatus(order, status, status === 'SHIPPED' ? { ttnNumber: 'DEV-1' } : {});
    orders.set(next.id, next);
    return HttpResponse.json({ ...next, warnings: [] });
  }),
  http.post(apiUrl('/manager/orders/:id/notify'), ({ request, params }) => {
    if (request.headers.get('x-user-role') !== 'manager') return forbidden('manager');
    const order = orders.get(String(params.id));
    return order
      ? HttpResponse.json({ ...order, warnings: [] })
      : notFound(`Order ${String(params.id)}`);
  }),

  /** Як бекенд: успішний callback → PAID → PENDING_REVIEW (підпис тут не перевіряємо). */
  http.post(apiUrl('/payments/webhook'), async ({ request }) => {
    const form = new URLSearchParams(await request.text());
    const payload = JSON.parse(atob(form.get('data') ?? '')) as { order_id: string };
    const order = orders.get(payload.order_id);
    if (!order) return notFound(`Order ${payload.order_id}`);
    orders.set(order.id, withStatus(order, 'PENDING_REVIEW', { paymentTransactionId: 'tx-1' }));
    return HttpResponse.json({ ok: true });
  }),
];

export const server = setupServer(...defaultHandlers);
