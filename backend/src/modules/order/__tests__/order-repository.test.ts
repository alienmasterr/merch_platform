import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OrderStatus, type IOrderRepository } from '@merch/contracts';
import { runMigrations } from '../../../infra/db/migrate';
import type { Queryable } from '../../../infra/db/queryable';
import { makeOrderData } from '../../../test-utils/order-fixtures';
import { InMemoryOrderRepository } from '../infrastructure/in-memory-order-repository';
import { PostgresOrderRepository } from '../infrastructure/postgres-order-repository';

function contract(name: string, makeRepo: () => IOrderRepository) {
  describe(name, () => {
    it('save/findById: повний знімок, оновлення статусу й ТТН без дублювання позицій', async () => {
      const repo = makeRepo();
      const order = makeOrderData({
        id: `${name}-1`,
        items: [
          { customProductId: 'p1', quantity: 2, unitPrice: 500 },
          { customProductId: 'p2', quantity: 1, unitPrice: 249.99 },
        ],
      });
      await repo.save(order);
      expect(await repo.findById(order.id)).toEqual(order);

      const updated = { ...order, status: OrderStatus.SHIPPED, ttnNumber: '2045', paymentTransactionId: 'tx' };
      await repo.save(updated);
      expect(await repo.findById(order.id)).toEqual(updated);
    });

    it('findByStatus: лише потрібний статус, від старших до новіших', async () => {
      const repo = makeRepo();
      await repo.save(makeOrderData({ id: `${name}-b`, status: OrderStatus.PENDING_REVIEW, createdAt: '2026-10-22T12:00:00.000Z' }));
      await repo.save(makeOrderData({ id: `${name}-a`, status: OrderStatus.PENDING_REVIEW, createdAt: '2026-10-22T11:00:00.000Z' }));
      await repo.save(makeOrderData({ id: `${name}-c`, status: OrderStatus.CREATED }));
      const ids = (await repo.findByStatus(OrderStatus.PENDING_REVIEW)).map((o) => o.id);
      expect(ids).toEqual([`${name}-a`, `${name}-b`]);
    });

    it('негатив: неіснуюче замовлення → null', async () => {
      expect(await makeRepo().findById('missing')).toBeNull();
    });
  });
}

contract('InMemoryOrderRepository', () => new InMemoryOrderRepository());

it('InMemoryOrderRepository повертає копії, а не внутрішній стан', async () => {
  const repo = new InMemoryOrderRepository();
  const order = makeOrderData();
  await repo.save(order);
  order.status = OrderStatus.CANCELLED;
  (await repo.findById(order.id))!.status = OrderStatus.SHIPPED;
  expect((await repo.findById(order.id))?.status).toBe(OrderStatus.CREATED);
});

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('PostgresOrderRepository (справжня БД)', () => {
  const schema = `test_orders_${Date.now()}`;
  let admin: pg.Pool;
  let pool: pg.Pool;

  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: url });
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` });
    await runMigrations(pool, fileURLToPath(new URL('../../../infra/migrations/', import.meta.url)));
    await pool.query(`
      INSERT INTO categories (id, name, slug) VALUES ('c', 'C', 'c');
      INSERT INTO apparel_items (id, kind, title, base_price, size, color, category_id) VALUES ('i', 'TOP', 'T', 1, 'M', 'white', 'c');
      INSERT INTO custom_merch_products (id, base_item_id) VALUES ('p1', 'i'), ('p2', 'i');`);
  });

  afterAll(async () => {
    await pool?.end();
    await admin?.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin?.end();
  });

  contract('PostgresOrderRepository', () => new PostgresOrderRepository(pool));

  it('негатив: позиція з неіснуючим виробом відхиляється, замовлення не створюється (атомарно)', async () => {
    const repo = new PostgresOrderRepository(pool);
    const order = makeOrderData({ id: 'atomic', items: [{ customProductId: 'ghost', quantity: 1, unitPrice: 1 }] });
    await expect(repo.save(order)).rejects.toThrow(/foreign key/);
    expect(await repo.findById('atomic')).toBeNull();
  });
});

it('PostgresOrderRepository.save робить один запит', async () => {
  const calls: string[] = [];
  const db: Queryable = { query: async (text) => (calls.push(text), { rows: [] }) };
  await new PostgresOrderRepository(db).save(makeOrderData());
  expect(calls).toHaveLength(1);
  expect(calls[0]).toContain('jsonb_to_recordset');
});
