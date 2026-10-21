import { describe, expect, it } from 'vitest';
import { ApparelFilter, Category, TopWearItem } from '@merch/contracts';
import type { Queryable, QueryResult } from '../../../infra/db/queryable';
import { PostgresCatalogRepository } from '../infrastructure/postgres-catalog-repository';
import { makeHoodie, makeMug } from '../../../test-utils/fixtures';

class FakeDb implements Queryable {
  calls: { text: string; values: unknown[] }[] = [];
  next: QueryResult = { rows: [] };
  async query(text: string, values: unknown[] = []): Promise<QueryResult> {
    this.calls.push({ text, values });
    return this.next;
  }
}

describe('PostgresCatalogRepository (fake Queryable)', () => {
  it('findById повертає null, якщо рядка немає', async () => {
    const db = new FakeDb();
    expect(await new PostgresCatalogRepository(db).findById('x')).toBeNull();
    expect(db.calls[0]?.values).toEqual(['x']);
  });

  it('findById мапить рядок TOP у TopWearItem (NUMERIC приходить рядком)', async () => {
    const db = new FakeDb();
    db.next = {
      rows: [{
        id: 'h1', kind: 'TOP', title: 'Hoodie', base_price: '900.00', size: 'L', color: 'grey',
        fabric_composition: 'cotton', in_stock: true, category_id: 'c1', category_name: 'Худі',
        category_slug: 'hoodies', has_hood: true, has_pockets: false,
      }],
    };
    const item = await new PostgresCatalogRepository(db).findById('h1');
    expect(item).toBeInstanceOf(TopWearItem);
    expect(item?.getBasePrice()).toBe(900);
    expect((item as TopWearItem).hasHood).toBe(true);
  });

  it('негатив: невідомий kind у БД кидає помилку', async () => {
    const db = new FakeDb();
    db.next = { rows: [{ id: 'z', kind: 'WEIRD', title: 't', base_price: '1', size: 's', color: 'c', in_stock: true, category_id: 'c', category_name: 'n', category_slug: 's' }] };
    await expect(new PostgresCatalogRepository(db).findById('z')).rejects.toThrow(/Unknown apparel kind/);
  });

  it('findAll будує WHERE з усіх полів фільтра з нумерованими параметрами', async () => {
    const db = new FakeDb();
    await new PostgresCatalogRepository(db).findAll(
      new ApparelFilter({ categoryId: 'c1', size: 'M', color: 'red', minPrice: 100, maxPrice: 500, inStockOnly: true }),
    );
    const call = db.calls[0]!;
    expect(call.text).toContain('i.category_id = $1');
    expect(call.text).toContain('LOWER(i.size) = LOWER($2)');
    expect(call.text).toContain('i.base_price <= $5');
    expect(call.text).toContain('i.in_stock = TRUE');
    expect(call.values).toEqual(['c1', 'M', 'red', 100, 500]);
  });

  it('findAll без фільтра не додає WHERE', async () => {
    const db = new FakeDb();
    await new PostgresCatalogRepository(db).findAll();
    expect(db.calls[0]?.text).not.toContain('WHERE');
  });

  it('save записує специфічні поля TOP і null для чужих', async () => {
    const db = new FakeDb();
    await new PostgresCatalogRepository(db).save(makeHoodie());
    const values = db.calls[0]!.values;
    expect(values[1]).toBe('TOP');
    expect(values.slice(9)).toEqual([true, true, null, null, null]);
  });

  it('save записує accessory_type для аксесуара', async () => {
    const db = new FakeDb();
    await new PostgresCatalogRepository(db).save(makeMug());
    expect(db.calls[0]!.values.slice(9)).toEqual([null, null, null, null, 'mug']);
  });

  it('updateStock і категорії виконують очікувані запити', async () => {
    const db = new FakeDb();
    const repo = new PostgresCatalogRepository(db);
    await repo.updateStock('a', false);
    await repo.saveCategory(new Category('c', 'N', 's'));
    expect(db.calls[0]?.values).toEqual(['a', false]);
    expect(db.calls[1]?.values).toEqual(['c', 'N', 's']);
    db.next = { rows: [{ id: 'c', name: 'N', slug: 's' }] };
    expect((await repo.findAllCategories())[0]?.getName()).toBe('N');
    expect((await repo.findCategoryById('c'))?.getSlug()).toBe('s');
  });
});
