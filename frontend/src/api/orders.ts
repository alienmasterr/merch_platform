import { api, unwrap } from './client';
import type { CreateOrderRequest, Order, PaymentInvoice } from './types';

export interface ShippingQuote {
  city: string;
  weightKg: number;
  cost: number;
  currency: 'UAH';
}

export function getShippingCost(city: string, weightKg: number): Promise<ShippingQuote> {
  return unwrap(api.GET('/delivery/shipping-cost', { params: { query: { city, weightKg } } }));
}

export function createOrder(body: CreateOrderRequest): Promise<Order> {
  return unwrap(api.POST('/orders', { body }));
}

export function getOrder(id: string): Promise<Order> {
  return unwrap(api.GET('/orders/{id}', { params: { path: { id } } }));
}

export function checkoutOrder(id: string): Promise<PaymentInvoice> {
  return unwrap(api.POST('/orders/{id}/checkout', { params: { path: { id } } }));
}
