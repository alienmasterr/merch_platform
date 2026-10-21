import {
  ApparelKind,
  Category,
  type ApparelFilter,
  type ICatalogRepository,
  type MerchApparelItem,
  AccessoryItem,
  BottomWearItem,
  TopWearItem,
} from '@merch/contracts';
import type { Queryable } from '../../../infra/db/queryable';
import { createApparelItem } from '../domain/apparel-item-factory';

const SELECT_ITEMS = `
  SELECT i.*, c.name AS category_name, c.slug AS category_slug
  FROM apparel_items i
  JOIN categories c ON c.id = i.category_id`;

export class PostgresCatalogRepository implements ICatalogRepository {
  private readonly db: Queryable;

  constructor(db: Queryable) {
    this.db = db;
  }

  async findById(id: string): Promise<MerchApparelItem | null> {
    const { rows } = await this.db.query(`${SELECT_ITEMS} WHERE i.id = $1`, [id]);
    const row = rows[0];
    return row ? this.toItem(row) : null;
  }

  async findAll(filter?: ApparelFilter): Promise<MerchApparelItem[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const add = (sql: string, value: unknown): void => {
      values.push(value);
      conditions.push(sql.replace('?', `$${values.length}`));
    };

    if (filter?.categoryId !== undefined) add('i.category_id = ?', filter.categoryId);
    if (filter?.size !== undefined) add('LOWER(i.size) = LOWER(?)', filter.size);
    if (filter?.color !== undefined) add('LOWER(i.color) = LOWER(?)', filter.color);
    if (filter?.minPrice !== undefined) add('i.base_price >= ?', filter.minPrice);
    if (filter?.maxPrice !== undefined) add('i.base_price <= ?', filter.maxPrice);
    if (filter?.inStockOnly) conditions.push('i.in_stock = TRUE');

    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.db.query(`${SELECT_ITEMS}${where} ORDER BY i.title, i.size`, values);
    return rows.map((row) => this.toItem(row));
  }

  async save(item: MerchApparelItem): Promise<void> {
    const hood = item instanceof TopWearItem ? item : null;
    const bottom = item instanceof BottomWearItem ? item : null;
    const accessory = item instanceof AccessoryItem ? item : null;

    await this.db.query(
      `INSERT INTO apparel_items
         (id, kind, title, base_price, size, color, fabric_composition, in_stock, category_id,
          has_hood, has_pockets, waist_cm, length_cm, accessory_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title, base_price = EXCLUDED.base_price, size = EXCLUDED.size,
         color = EXCLUDED.color, fabric_composition = EXCLUDED.fabric_composition,
         in_stock = EXCLUDED.in_stock, category_id = EXCLUDED.category_id,
         has_hood = EXCLUDED.has_hood, has_pockets = EXCLUDED.has_pockets,
         waist_cm = EXCLUDED.waist_cm, length_cm = EXCLUDED.length_cm,
         accessory_type = EXCLUDED.accessory_type`,
      [
        item.getId(),
        item.kind,
        item.getTitle(),
        item.getBasePrice(),
        item.getSize(),
        item.getColor(),
        item.getFabricComposition(),
        item.isInStock(),
        item.getCategory().getId(),
        hood?.hasHood ?? null,
        hood?.hasPockets ?? null,
        bottom?.waistCm ?? null,
        bottom?.lengthCm ?? null,
        accessory?.accessoryType ?? null,
      ],
    );
  }

  async updateStock(id: string, inStock: boolean): Promise<void> {
    await this.db.query('UPDATE apparel_items SET in_stock = $2 WHERE id = $1', [id, inStock]);
  }

  async findAllCategories(): Promise<Category[]> {
    const { rows } = await this.db.query('SELECT id, name, slug FROM categories ORDER BY name');
    return rows.map((r) => new Category(String(r.id), String(r.name), String(r.slug)));
  }

  async findCategoryById(id: string): Promise<Category | null> {
    const { rows } = await this.db.query('SELECT id, name, slug FROM categories WHERE id = $1', [id]);
    const r = rows[0];
    return r ? new Category(String(r.id), String(r.name), String(r.slug)) : null;
  }

  async saveCategory(category: Category): Promise<void> {
    await this.db.query(
      `INSERT INTO categories (id, name, slug) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug`,
      [category.getId(), category.getName(), category.getSlug()],
    );
  }

  private toItem(row: Record<string, unknown>): MerchApparelItem {
    const base = {
      id: String(row.id),
      title: String(row.title),
      basePrice: Number(row.base_price),
      size: String(row.size),
      color: String(row.color),
      fabricComposition: String(row.fabric_composition ?? ''),
      inStock: Boolean(row.in_stock),
      category: new Category(String(row.category_id), String(row.category_name), String(row.category_slug)),
    };
    switch (row.kind) {
      case ApparelKind.TOP:
        return createApparelItem({
          ...base,
          kind: ApparelKind.TOP,
          hasHood: Boolean(row.has_hood),
          hasPockets: Boolean(row.has_pockets),
        });
      case ApparelKind.BOTTOM:
        return createApparelItem({
          ...base,
          kind: ApparelKind.BOTTOM,
          waistCm: Number(row.waist_cm),
          lengthCm: Number(row.length_cm),
        });
      case ApparelKind.ACCESSORY:
        return createApparelItem({
          ...base,
          kind: ApparelKind.ACCESSORY,
          accessoryType: String(row.accessory_type ?? ''),
        });
      default:
        throw new Error(`Unknown apparel kind in DB: ${String(row.kind)}`);
    }
  }
}
