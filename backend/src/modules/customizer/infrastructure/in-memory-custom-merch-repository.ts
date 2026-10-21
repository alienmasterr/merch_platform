import type { ICustomMerchProduct, ICustomMerchRepository } from '@merch/contracts';

export class InMemoryCustomMerchRepository implements ICustomMerchRepository {
  private readonly products = new Map<string, ICustomMerchProduct>();

  async save(product: ICustomMerchProduct): Promise<void> {
    this.products.set(product.getId(), product);
  }

  async findById(id: string): Promise<ICustomMerchProduct | null> {
    return this.products.get(id) ?? null;
  }
}
