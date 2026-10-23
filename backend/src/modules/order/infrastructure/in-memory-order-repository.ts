import type { IOrderRepository, OrderData, OrderStatus } from '@merch/contracts';

export class InMemoryOrderRepository implements IOrderRepository {
  private readonly orders = new Map<string, OrderData>();

  async save(order: OrderData): Promise<void> {
    this.orders.set(order.id, structuredClone(order));
  }

  async findById(id: string): Promise<OrderData | null> {
    const order = this.orders.get(id);
    return order ? structuredClone(order) : null;
  }

  async findByStatus(status: OrderStatus): Promise<OrderData[]> {
    return [...this.orders.values()]
      .filter((o) => o.status === status)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((o) => structuredClone(o));
  }
}
