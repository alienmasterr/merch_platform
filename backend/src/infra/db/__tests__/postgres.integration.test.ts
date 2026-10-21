import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApparelFilter } from '@merch/contracts';
import { PostgresCatalogRepository } from '../../../modules/catalog/infrastructure/postgres-catalog-repository';
import { seedCatalog } from '../../../modules/catalog/infrastructure/dev-seed';
import { CustomMerchProduct } from '../../../modules/customizer/domain/custom-merch-product';
import { PrintConfiguration } from '../../../modules/customizer/domain/print-configuration';
import { PostgresCustomMerchRepository } from '../../../modules/customizer/infrastructure/postgres-custom-merch-repository';
import { runMigrations } from '../migrate';

/**
 * Запускається лише з TEST_DATABASE_URL (напр. postgres://merch:merch@localhost:5432/merch).
 * Працює у власній тимчасовій схемі й прибирає за собою.
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('Postgres integration', () => {
  const schema = `test_${Date.now()}`;
  let admin: pg.Pool;
  let pool: pg.Pool;

  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: url });
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` });
    await runMigrations(pool, fileURLToPath(new URL('../../migrations/', import.meta.url)));
  });

  afterAll(async () => {
    await pool?.end();
    await admin?.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin?.end();
  });

  it('міграції ідемпотентні', async () => {
    expect(await runMigrations(pool, fileURLToPath(new URL('../../migrations/', import.meta.url)))).toEqual([]);
  });

  it('seed, пошук з фільтрами, оновлення наявності', async () => {
    const repo = new PostgresCatalogRepository(pool);
    await seedCatalog(repo);
    await seedCatalog(repo); // повторний seed не дублює

    expect(await repo.findAll()).toHaveLength(6);
    const whites = await repo.findAll(new ApparelFilter({ color: 'WHITE', maxPrice: 360 }));
    expect(whites.map((i) => i.getId()).sort()).toEqual(['mug-white', 'tee-white-m']);

    await repo.updateStock('mug-white', false);
    expect((await repo.findById('mug-white'))?.isInStock()).toBe(false);
    expect(await repo.findAll(new ApparelFilter({ inStockOnly: true }))).toHaveLength(5);
    expect((await repo.findAllCategories()).length).toBe(4);
  });

  it('CustomMerchProduct: збереження й відновлення разом з JSONB-конфігураціями', async () => {
    const catalog = new PostgresCatalogRepository(pool);
    const repo = new PostgresCustomMerchRepository(pool, catalog);
    const base = (await catalog.findById('tee-white-m'))!;
    const print = new PrintConfiguration({
      printFileUrl: 'http://x/a.png', placement: 'CHEST', technology: 'DTF',
      widthMm: 120, heightMm: 80, offsetX: 5, offsetY: -5, scale: 1.5,
    });
    await repo.save(new CustomMerchProduct({ id: 'p-int', baseItem: base, printConfigs: [print], previewImageUrl: 'http://x/p.svg' }));

    const loaded = (await repo.findById('p-int'))!;
    expect(loaded.getPrintConfigs()[0]).toMatchObject({ technology: 'DTF', scale: 1.5, offsetY: -5 });
    expect(loaded.getTotalCost()).toBe((await repo.findById('p-int'))!.getTotalCost());
    expect(loaded.isMockupApproved()).toBe(false);

    loaded.setApprovalStatus(true);
    await repo.save(loaded);
    expect((await repo.findById('p-int'))!.isMockupApproved()).toBe(true);
    expect(await repo.findById('missing')).toBeNull();
  });
});
