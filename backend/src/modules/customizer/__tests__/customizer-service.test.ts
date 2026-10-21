import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError, PrintPlacement, ValidationError } from '@merch/contracts';
import { CustomizerService } from '../application/customizer-service';
import { CustomMerchBuilder } from '../domain/custom-merch-builder';
import { InMemoryCustomMerchRepository } from '../infrastructure/in-memory-custom-merch-repository';
import { InMemoryStorageService } from '../infrastructure/in-memory-storage-service';
import { SvgPreviewRenderer } from '../infrastructure/svg-preview-renderer';
import { InMemoryCatalogRepository } from '../../catalog/infrastructure/in-memory-catalog-repository';
import { makeTee, tees } from '../../../test-utils/fixtures';
import { printData } from './helpers';

describe('CustomizerService', () => {
  let catalog: InMemoryCatalogRepository;
  let products: InMemoryCustomMerchRepository;
  let storage: InMemoryStorageService;
  let service: CustomizerService;

  beforeEach(async () => {
    catalog = new InMemoryCatalogRepository();
    products = new InMemoryCustomMerchRepository();
    storage = new InMemoryStorageService();
    await catalog.saveCategory(tees);
    await catalog.save(makeTee());
    service = new CustomizerService({
      catalogRepo: catalog,
      productRepo: products,
      storage,
      builderFactory: () => new CustomMerchBuilder({ storage, renderer: new SvgPreviewRenderer() }),
    });
  });

  it('uploadPrint зберігає валідний файл', async () => {
    const { url } = await service.uploadPrint('logo.png', new Uint8Array([1, 2, 3]));
    expect(url).toContain('prints/');
    expect(storage.files.size).toBe(1);
  });

  it('негатив: uploadPrint відхиляє формат і порожній файл', async () => {
    await expect(service.uploadPrint('virus.exe', new Uint8Array([1]))).rejects.toThrow(ValidationError);
    await expect(service.uploadPrint('logo.png', new Uint8Array())).rejects.toThrow(ValidationError);
    expect(storage.files.size).toBe(0);
  });

  it("createCustomProduct будує продукт, генерує прев'ю і зберігає в репозиторій", async () => {
    const product = await service.createCustomProduct({ baseItemId: 'tee-1', prints: [printData()] });
    expect(product.getPreviewImageUrl()).toContain('previews/');
    expect(product.getTotalCost()).toBe(450);
    expect(await products.findById(product.getId())).toBe(product);
  });

  it('негатив: невідомий базовий товар', async () => {
    await expect(service.createCustomProduct({ baseItemId: 'nope', prints: [printData()] })).rejects.toThrow(NotFoundError);
  });

  it('негатив: товару немає в наявності', async () => {
    await catalog.updateStock('tee-1', false);
    await expect(service.createCustomProduct({ baseItemId: 'tee-1', prints: [printData()] })).rejects.toThrow(/out of stock/);
  });

  it('негатив: невалідний принт не зберігає нічого', async () => {
    await expect(
      service.createCustomProduct({ baseItemId: 'tee-1', prints: [printData({ placement: PrintPlacement.LEFT_LEG })] }),
    ).rejects.toThrow(/not allowed/);
    expect(await products.findById('anything')).toBeNull();
    expect(storage.files.size).toBe(0);
  });

  it('паралельні запити не псують один одного (білдер на запит)', async () => {
    const [a, b] = await Promise.all([
      service.createCustomProduct({ baseItemId: 'tee-1', prints: [printData({ placement: PrintPlacement.CHEST })] }),
      service.createCustomProduct({ baseItemId: 'tee-1', prints: [printData({ placement: PrintPlacement.BACK })] }),
    ]);
    expect(a.getId()).not.toBe(b.getId());
    expect(a.getPrintConfigs()[0]?.placement).toBe('CHEST');
    expect(b.getPrintConfigs()[0]?.placement).toBe('BACK');
  });

  it('getProduct і setMockupApproval', async () => {
    const created = await service.createCustomProduct({ baseItemId: 'tee-1', prints: [printData()] });
    expect((await service.getProduct(created.getId())).isMockupApproved()).toBe(false);
    await service.setMockupApproval(created.getId(), true);
    expect((await service.getProduct(created.getId())).isMockupApproved()).toBe(true);
    await expect(service.getProduct('nope')).rejects.toThrow(NotFoundError);
  });
});
