import type { IOrderRepository, OrderData, OrderItemData, OrderStatus, RecipientDetails } from '@merch/contracts';
import type { Queryable } from '../../../infra/db/queryable';

const SELECT_ORDERS = `
  SELECT o.*,
         COALESCE(
           (SELECT json_agg(json_build_object(
                     'customProductId', i.custom_product_id,
                     'quantity', i.quantity,
                     'unitPrice', i.unit_price) ORDER BY i.position)
            FROM order_items i WHERE i.order_id = o.id),
           '[]'::json) AS items
  FROM orders o`;

/**
 * Замовлення і позиції пишуться одним запитом (CTE), тож запис атомарний.
 * Позиції після створення не змінюються, тому для них ON CONFLICT DO NOTHING.
 */
export class PostgresOrderRepository implements IOrderRepository {
  private readonly db: Queryable;

  constructor(db: Queryable) {
    this.db = db;
  }

  async save(order: OrderData): Promise<void> {
    const items = order.items.map((i, position) => ({
      position,
      custom_product_id: i.customProductId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
    }));
    await this.db.query(
      `WITH saved AS (
         INSERT INTO orders (id, status, recipient, shipping_cost, ttn_number, payment_transaction_id, created_at)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           recipient = EXCLUDED.recipient,
           shipping_cost = EXCLUDED.shipping_cost,
           ttn_number = EXCLUDED.ttn_number,
           payment_transaction_id = EXCLUDED.payment_transaction_id,
           updated_at = now()
         RETURNING id
       )
       INSERT INTO order_items (order_id, position, custom_product_id, quantity, unit_price)
       SELECT saved.id, x.position, x.custom_product_id, x.quantity, x.unit_price
       FROM saved, jsonb_to_recordset($8::jsonb)
         AS x(position INTEGER, custom_product_id TEXT, quantity INTEGER, unit_price NUMERIC)
       ON CONFLICT (order_id, position) DO NOTHING`,
      [
        order.id,
        order.status,
        JSON.stringify(order.recipient),
        order.shippingCost,
        order.ttnNumber,
        order.paymentTransactionId,
        order.createdAt,
        JSON.stringify(items),
      ],
    );
  }

  async findById(id: string): Promise<OrderData | null> {
    const { rows } = await this.db.query(`${SELECT_ORDERS} WHERE o.id = $1`, [id]);
    const row = rows[0];
    return row ? this.toOrder(row) : null;
  }

  async findByStatus(status: OrderStatus): Promise<OrderData[]> {
    const { rows } = await this.db.query(`${SELECT_ORDERS} WHERE o.status = $1 ORDER BY o.created_at`, [status]);
    return rows.map((row) => this.toOrder(row));
  }

  private toOrder(row: Record<string, unknown>): OrderData {
    const parse = <T>(v: unknown): T => (typeof v === 'string' ? JSON.parse(v) : v) as T;
    const items = parse<{ customProductId: string; quantity: unknown; unitPrice: unknown }[]>(row.items);
    const createdAt = row.created_at instanceof Date ? row.created_at : new Date(String(row.created_at));
    return {
      id: String(row.id),
      status: String(row.status) as OrderStatus,
      items: items.map(
        (i): OrderItemData => ({ customProductId: i.customProductId, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) }),
      ),
      recipient: parse<RecipientDetails>(row.recipient),
      shippingCost: Number(row.shipping_cost),
      ttnNumber: row.ttn_number === null || row.ttn_number === undefined ? null : String(row.ttn_number),
      paymentTransactionId:
        row.payment_transaction_id === null || row.payment_transaction_id === undefined ? null : String(row.payment_transaction_id),
      createdAt: createdAt.toISOString(),
    };
  }
}
