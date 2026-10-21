import type { IPrintConfiguration, MerchApparelItem } from '@merch/contracts';

/** Малює прев'ю макета (Strategy: можна підмінити SVG-рендерер на растровий). */
export interface IPreviewRenderer {
  readonly fileExtension: string;
  render(baseItem: MerchApparelItem, prints: IPrintConfiguration[]): Uint8Array;
}
