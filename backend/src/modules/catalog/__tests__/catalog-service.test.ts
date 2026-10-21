import { beforeEach, describe, expect, it } from 'vitest';
import { ApparelFilter, ConflictError, NotFoundError, ValidationError } from '@merch/contracts';
import { CatalogService } from '../application/catalog-service';
import { InMemoryCatalogRepository } from '../infrastructure/in-memory-catalog-repository';
import { makeMug, makeTee, tees } from '../../../test-utils/fixtures';

describe('CatalogService (на in-memory репозиторії)', () => {
  let repo: InMemoryCatalogRepository;
  let service: CatalogService;

  beforeEach(async () => {
    repo = new InMemoryCatalogRepository();
    service = new CatalogService(repo);
    await repo.saveCategory(tees);
    await service.createProduct(makeTee());
  });

  it('getProductById повертає товар', async () => {
    expect((await service.getProductById('tee-1')).getTitle()).toBe('Tee');
  });

  it('негатив: getProductById кидає NotFoundError', async () => {
    await expect(service.getProductById('nope')).rejects.toThrow(NotFoundError);
  });

  it('createProduct додає товар, а дубль id дає ConflictError', async () => {
    await service.createProduct(makeMug());
    expect(await service.searchProducts()).toHaveLength(2);
    await expect(service.createProduct(makeMug())).rejects.toThrow(ConflictError);
  });

  it('searchProducts застосовує фільтр', async () => {
    await service.createProduct(makeMug());
    const found = await service.searchProducts(new ApparelFilter({ color: 'white', maxPrice: 200 }));
    expect(found.map((i) => i.getId())).toEqual(['mug-1']);
  });

  it('updatePrice зберігає нову ціну', async () => {
    await service.updatePrice('tee-1', 555);
    expect((await repo.findById('tee-1'))?.getBasePrice()).toBe(555);
  });

  it('негатив: updatePrice з мінусовою ціною і з невідомим id', async () => {
    await expect(service.updatePrice('tee-1', -10)).rejects.toThrow(ValidationError);
    await expect(service.updatePrice('nope', 10)).rejects.toThrow(NotFoundError);
  });

  it('updateStock змінює наявність', async () => {
    await service.updateStock('tee-1', false);
    expect((await repo.findById('tee-1'))?.isInStock()).toBe(false);
  });

  it('негатив: updateStock з невідомим id', async () => {
    await expect(service.updateStock('nope', true)).rejects.toThrow(NotFoundError);
  });

  it('категорії: список і пошук за id', async () => {
    expect(await service.getCategories()).toHaveLength(1);
    expect((await service.getCategoryById('cat-tees')).getSlug()).toBe('tees');
    await expect(service.getCategoryById('nope')).rejects.toThrow(NotFoundError);
  });
});
