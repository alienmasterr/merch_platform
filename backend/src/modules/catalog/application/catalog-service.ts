import {
  ConflictError,
  NotFoundError,
  type ApparelFilter,
  type Category,
  type ICatalogRepository,
  type MerchApparelItem,
} from '@merch/contracts';

export class CatalogService {
  private readonly catalogRepo: ICatalogRepository;

  constructor(catalogRepo: ICatalogRepository) {
    this.catalogRepo = catalogRepo;
  }

  async getProductById(id: string): Promise<MerchApparelItem> {
    const item = await this.catalogRepo.findById(id);
    if (!item) throw new NotFoundError(`Product ${id} not found`);
    return item;
  }

  searchProducts(filter?: ApparelFilter): Promise<MerchApparelItem[]> {
    return this.catalogRepo.findAll(filter);
  }

  async createProduct(item: MerchApparelItem): Promise<MerchApparelItem> {
    const existing = await this.catalogRepo.findById(item.getId());
    if (existing) throw new ConflictError(`Product ${item.getId()} already exists`);
    await this.catalogRepo.save(item);
    return item;
  }

  async updatePrice(id: string, newPrice: number): Promise<MerchApparelItem> {
    const item = await this.getProductById(id);
    item.setBasePrice(newPrice);
    await this.catalogRepo.save(item);
    return item;
  }

  async updateStock(id: string, inStock: boolean): Promise<MerchApparelItem> {
    const item = await this.getProductById(id);
    item.setInStock(inStock);
    await this.catalogRepo.updateStock(id, inStock);
    return item;
  }

  getCategories(): Promise<Category[]> {
    return this.catalogRepo.findAllCategories();
  }

  async getCategoryById(id: string): Promise<Category> {
    const category = await this.catalogRepo.findCategoryById(id);
    if (!category) throw new NotFoundError(`Category ${id} not found`);
    return category;
  }
}
