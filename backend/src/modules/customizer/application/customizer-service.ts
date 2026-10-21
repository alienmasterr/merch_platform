import {
  NotFoundError,
  ValidationError,
  type ICatalogRepository,
  type ICustomMerchProduct,
  type ICustomMerchRepository,
  type IMerchBuilder,
  type IStorageService,
  type PrintConfigurationData,
} from '@merch/contracts';
import { PrintConfiguration } from '../domain/print-configuration';
import { getFileExtension, isAllowedPrintFile } from '../domain/print-file-rules';

export interface CustomizerServiceDeps {
  catalogRepo: ICatalogRepository;
  productRepo: ICustomMerchRepository;
  storage: IStorageService;
  /** Білдер зі станом, тому на кожен запит створюємо новий. */
  builderFactory: () => IMerchBuilder;
}

export interface CreateCustomProductRequest {
  baseItemId: string;
  prints: PrintConfigurationData[];
}

export class CustomizerService {
  private readonly catalogRepo: ICatalogRepository;
  private readonly productRepo: ICustomMerchRepository;
  private readonly storage: IStorageService;
  private readonly builderFactory: () => IMerchBuilder;

  constructor(deps: CustomizerServiceDeps) {
    this.catalogRepo = deps.catalogRepo;
    this.productRepo = deps.productRepo;
    this.storage = deps.storage;
    this.builderFactory = deps.builderFactory;
  }

  async uploadPrint(fileName: string, data: Uint8Array): Promise<{ url: string }> {
    if (!isAllowedPrintFile(getFileExtension(fileName), data.byteLength)) {
      throw new ValidationError('Unsupported print file: use png, jpg, webp or svg up to 20 MB');
    }
    const url = await this.storage.uploadPrintOriginal(fileName, data);
    return { url };
  }

  async createCustomProduct(request: CreateCustomProductRequest): Promise<ICustomMerchProduct> {
    const base = await this.catalogRepo.findById(request.baseItemId);
    if (!base) throw new NotFoundError(`Product ${request.baseItemId} not found`);
    if (!base.isInStock()) throw new ValidationError('Base item is out of stock');

    const builder = this.builderFactory();
    builder.setBaseItem(base);
    for (const data of request.prints) {
      builder.addPrint(new PrintConfiguration(data));
    }
    await builder.generatePreview();
    const product = builder.getResult();
    await this.productRepo.save(product);
    return product;
  }

  async getProduct(id: string): Promise<ICustomMerchProduct> {
    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundError(`Custom product ${id} not found`);
    return product;
  }

  async setMockupApproval(id: string, approved: boolean): Promise<ICustomMerchProduct> {
    const product = await this.getProduct(id);
    product.setApprovalStatus(approved);
    await this.productRepo.save(product);
    return product;
  }
}
