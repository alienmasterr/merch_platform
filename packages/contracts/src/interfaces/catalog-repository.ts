import type { ApparelFilter } from '../domain/apparel-filter';
import type { Category } from '../domain/category';
import type { MerchApparelItem } from '../domain/merch-apparel-item';

export interface ICatalogRepository {
  findById(id: string): Promise<MerchApparelItem | null>;
  findAll(filter?: ApparelFilter): Promise<MerchApparelItem[]>;
  save(item: MerchApparelItem): Promise<void>;
  updateStock(id: string, inStock: boolean): Promise<void>;
  findAllCategories(): Promise<Category[]>;
  findCategoryById(id: string): Promise<Category | null>;
  saveCategory(category: Category): Promise<void>;
}
