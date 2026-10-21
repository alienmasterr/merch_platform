import type { MerchApparelItem } from '../domain/merch-apparel-item';
import type { ICustomMerchProduct } from './custom-merch-product';
import type { IPrintConfiguration } from './print-configuration';

export interface IMerchBuilder {
  reset(): void;
  setBaseItem(item: MerchApparelItem): void;
  addPrint(config: IPrintConfiguration): void;
  generatePreview(): Promise<string>;
  getResult(): ICustomMerchProduct;
}
