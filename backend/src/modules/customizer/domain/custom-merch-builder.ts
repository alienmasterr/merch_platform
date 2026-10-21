import { randomUUID } from 'node:crypto';
import {
  ValidationError,
  type IMerchBuilder,
  type ICustomMerchProduct,
  type IPrintConfiguration,
  type IStorageService,
  type MerchApparelItem,
} from '@merch/contracts';
import { CustomMerchProduct } from './custom-merch-product';
import { PLACEMENT_LIMITS } from './placement-limits';
import type { IPreviewRenderer } from './preview-renderer';

export interface CustomMerchBuilderDeps {
  storage: IStorageService;
  renderer: IPreviewRenderer;
  idGenerator?: () => string;
}

/**
 * Builder: збирає CustomMerchProduct крок за кроком.
 * Екземпляр стану не потокобезпечний, тому на кожен запит створюється новий білдер (див. CustomizerService).
 */
export class CustomMerchBuilder implements IMerchBuilder {
  private readonly storage: IStorageService;
  private readonly renderer: IPreviewRenderer;
  private readonly idGenerator: () => string;

  private productId = '';
  private baseItem: MerchApparelItem | null = null;
  private prints: IPrintConfiguration[] = [];
  private previewUrl: string | null = null;

  constructor(deps: CustomMerchBuilderDeps) {
    this.storage = deps.storage;
    this.renderer = deps.renderer;
    this.idGenerator = deps.idGenerator ?? randomUUID;
    this.reset();
  }

  reset(): void {
    this.productId = this.idGenerator();
    this.baseItem = null;
    this.prints = [];
    this.previewUrl = null;
  }

  setBaseItem(item: MerchApparelItem): void {
    this.baseItem = item;
    // зміна базового виробу робить попередні принти й прев'ю недійсними
    this.prints = [];
    this.previewUrl = null;
  }

  addPrint(config: IPrintConfiguration): void {
    const base = this.requireBaseItem();
    const placement = config.getPlacement();

    if (!base.getAllowedPlacements().includes(placement)) {
      throw new ValidationError(`Placement ${placement} is not allowed for this item`);
    }
    if (this.prints.some((p) => p.getPlacement() === placement)) {
      throw new ValidationError(`Placement ${placement} already has a print`);
    }
    const limit = PLACEMENT_LIMITS[placement];
    if (!config.validateBounds(limit.maxWidthMm, limit.maxHeightMm)) {
      throw new ValidationError(`Print exceeds the ${placement} area (${limit.maxWidthMm}x${limit.maxHeightMm} mm)`);
    }
    this.prints.push(config);
    this.previewUrl = null;
  }

  async generatePreview(): Promise<string> {
    const base = this.requireBaseItem();
    const bytes = this.renderer.render(base, this.prints);
    const url = await this.storage.uploadPreview(`${this.productId}.${this.renderer.fileExtension}`, bytes);
    this.previewUrl = url;
    return url;
  }

  /** Повертає готовий продукт і скидає білдер, щоб його можна було використати повторно. */
  getResult(): ICustomMerchProduct {
    const base = this.requireBaseItem();
    if (this.prints.length === 0) {
      throw new ValidationError('Add at least one print before building the product');
    }
    const product = new CustomMerchProduct({
      id: this.productId,
      baseItem: base,
      printConfigs: this.prints,
      previewImageUrl: this.previewUrl,
    });
    this.reset();
    return product;
  }

  private requireBaseItem(): MerchApparelItem {
    if (!this.baseItem) throw new ValidationError('Base item is not set');
    return this.baseItem;
  }
}
