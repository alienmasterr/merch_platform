import type {
  ApparelFilter,
  Category,
  ICatalogRepository,
  MerchApparelItem,
} from '@merch/contracts';

export class InMemoryCatalogRepository implements ICatalogRepository {
  private readonly items = new Map<string, MerchApparelItem>();
  private readonly categories = new Map<string, Category>();

  async findById(id: string): Promise<MerchApparelItem | null> {
    return this.items.get(id) ?? null;
  }

  async findAll(filter?: ApparelFilter): Promise<MerchApparelItem[]> {
    const all = [...this.items.values()];
    return filter ? all.filter((item) => filter.matches(item)) : all;
  }

  async save(item: MerchApparelItem): Promise<void> {
    this.items.set(item.getId(), item);
  }

  async updateStock(id: string, inStock: boolean): Promise<void> {
    this.items.get(id)?.setInStock(inStock);
  }

  async findAllCategories(): Promise<Category[]> {
    return [...this.categories.values()];
  }

  async findCategoryById(id: string): Promise<Category | null> {
    return this.categories.get(id) ?? null;
  }

  async saveCategory(category: Category): Promise<void> {
    this.categories.set(category.getId(), category);
  }
}
