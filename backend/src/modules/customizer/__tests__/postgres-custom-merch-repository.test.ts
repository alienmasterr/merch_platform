import { describe, expect, it } from 'vitest';
import type { Queryable, QueryResult } from '../../../infra/db/queryable';
import { CustomMerchProduct } from '../domain/custom-merch-product';
import { PostgresCustomMerchRepository } from '../infrastructure/postgres-custom-merch-repository';
import { InMemoryCatalogRepository } from '../../catalog/infrastructure/in-memory-catalog-repository';
import { makeTee, tees } from '../../../test-utils/fixtures';
import { makePrint } from './helpers';

class FakeDb implements Queryable {
  calls: { text: string; values: unknown[] }[] = [];
  next: QueryResult = { rows: [] };
  async query(text: string, values: unknown[] = []): Promise<QueryResult> {
    this.calls.push({ text, values });
    return this.next;
  }
}

async function setup() {
  const catalog = new InMemoryCatalogRepository();
  await catalog.saveCategory(tees);
  await catalog.save(makeTee());
  const db = new FakeDb();
  return { db, repo: new PostgresCustomMerchRepository(db, catalog), catalog };
}

describe('PostgresCustomMerchRepository (fake Queryable)', () => {
  it('save серіалізує конфігурації в JSON одним upsert-запитом', async () => {
    const { db, repo } = await setup();
    const product = new CustomMerchProduct({ id: 'p1', baseItem: makeTee(), printConfigs: [makePrint()], previewImageUrl: 'http://x/p.svg', mockupApproved: true });
    await repo.save(product);

    expect(db.calls).toHaveLength(1);
    const [id, baseId, json, preview, approved] = db.calls[0]!.values;
    expect([id, baseId, preview, approved]).toEqual(['p1', 'tee-1', 'http://x/p.svg', true]);
    expect(JSON.parse(String(json))[0]).toMatchObject({ placement: 'CHEST', technology: 'DTG', widthMm: 200 });
  });

  it('findById відновлює продукт разом з базовим виробом (jsonb як об\u02bcєкт)', async () => {
    const { db, repo } = await setup();
    db.next = { rows: [{ id: 'p1', base_item_id: 'tee-1', print_configs: [makePrint().toData()], preview_image_url: null, mockup_approved: false }] };
    const product = await repo.findById('p1');
    expect(product?.getBaseItem().getId()).toBe('tee-1');
    expect(product?.getPrintConfigs()[0]?.calculatePrintCost()).toBe(100);
    expect(product?.getPreviewImageUrl()).toBeNull();
  });

  it('findById приймає print_configs і як JSON-рядок', async () => {
    const { db, repo } = await setup();
    db.next = { rows: [{ id: 'p1', base_item_id: 'tee-1', print_configs: JSON.stringify([makePrint().toData()]), preview_image_url: 'u', mockup_approved: true }] };
    const product = await repo.findById('p1');
    expect(product?.isMockupApproved()).toBe(true);
  });

  it('негатив: немає рядка дає null, немає базового товару дає помилку', async () => {
    const { db, repo, catalog } = await setup();
    expect(await repo.findById('x')).toBeNull();
    db.next = { rows: [{ id: 'p1', base_item_id: 'ghost', print_configs: [], preview_image_url: null, mockup_approved: false }] };
    await expect(repo.findById('p1')).rejects.toThrow(/missing/);
    expect(catalog).toBeDefined();
  });
});
