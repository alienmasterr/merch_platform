import type { components } from './schema';

type Schemas = components['schemas'];

export type Category = Schemas['Category'];
export type ApparelItem = Schemas['ApparelItem'];
export type CreateApparelItemRequest = Schemas['CreateApparelItemRequest'];
export type PrintConfigurationInput = Schemas['PrintConfigurationInput'];
export type PrintConfiguration = Schemas['PrintConfiguration'];
export type CustomProduct = Schemas['CustomProduct'];
export type RecipientDetails = Schemas['RecipientDetails'];
export type CreateOrderRequest = Schemas['CreateOrderRequest'];
export type Order = Schemas['Order'];
export type OrderActionResult = Schemas['OrderActionResult'];
export type PaymentInvoice = Schemas['PaymentInvoice'];

export interface CatalogFilter {
  categoryId?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
}
