import type { IPrintConfiguration, MerchApparelItem } from '@merch/contracts';

export interface IPreviewRenderer {
  readonly fileExtension: string;
  render(baseItem: MerchApparelItem, prints: IPrintConfiguration[]): Uint8Array;
}
