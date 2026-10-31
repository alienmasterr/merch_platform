import type {
  ICatalogRepository,
  ICustomMerchProduct,
  ICustomMerchRepository,
  PrintConfigurationData,
} from '@merch/contracts';
import type { Queryable } from '../../../infra/db/queryable';
import { CustomMerchProduct } from '../domain/custom-merch-product';
import { PrintConfiguration } from '../domain/print-configuration';

export class PostgresCustomMerchRepository implements ICustomMerchRepository {
  private readonly db: Queryable;
  private readonly catalogRepo: ICatalogRepository;

  constructor(db: Queryable, catalogRepo: ICatalogRepository) {
    this.db = db;
    this.catalogRepo = catalogRepo;
  }

  async save(product: ICustomMerchProduct): Promise<void> {
    const configs: PrintConfigurationData[] = product.getPrintConfigs().map((c) => ({
      printFileUrl: c.printFileUrl,
      placement: c.placement,
      technology: c.technology,
      widthMm: c.widthMm,
      heightMm: c.heightMm,
      offsetX: c.offsetX,
      offsetY: c.offsetY,
      scale: c.scale,
    }));

    await this.db.query(
      `INSERT INTO custom_merch_products (id, base_item_id, print_configs, preview_image_url, mockup_approved)
       VALUES ($1, $2, $3::jsonb, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         print_configs = EXCLUDED.print_configs,
         preview_image_url = EXCLUDED.preview_image_url,
         mockup_approved = EXCLUDED.mockup_approved`,
      [
        product.getId(),
        product.getBaseItem().getId(),
        JSON.stringify(configs),
        product.getPreviewImageUrl(),
        product.isMockupApproved(),
      ],
    );
  }

  async findById(id: string): Promise<ICustomMerchProduct | null> {
    const { rows } = await this.db.query('SELECT * FROM custom_merch_products WHERE id = $1', [id]);
    const row = rows[0];
    if (!row) return null;

    const baseItem = await this.catalogRepo.findById(String(row.base_item_id));
    if (!baseItem) throw new Error(`Base item ${String(row.base_item_id)} of product ${id} is missing`);

    const raw = row.print_configs;
    const list = (typeof raw === 'string' ? JSON.parse(raw) : raw) as PrintConfigurationData[];

    return new CustomMerchProduct({
      id: String(row.id),
      baseItem,
      printConfigs: list.map((data) => new PrintConfiguration(data)),
      previewImageUrl: row.preview_image_url === null ? null : String(row.preview_image_url),
      mockupApproved: Boolean(row.mockup_approved),
    });
  }
}
