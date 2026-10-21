import type { MerchApparelItem } from '../domain/merch-apparel-item';
import type { IPrintConfiguration } from './print-configuration';

export interface ICustomMerchProduct {
  getId(): string;
  getBaseItem(): MerchApparelItem;
  getPrintConfigs(): IPrintConfiguration[];
  getPreviewImageUrl(): string | null;
  isMockupApproved(): boolean;
  getTotalCost(): number;
  setPreviewImageUrl(url: string): void;
  setApprovalStatus(approved: boolean): void;
}

export interface ICustomMerchRepository {
  save(product: ICustomMerchProduct): Promise<void>;
  findById(id: string): Promise<ICustomMerchProduct | null>;
}
