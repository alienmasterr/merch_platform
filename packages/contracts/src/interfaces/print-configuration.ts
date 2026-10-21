import type { PrintPlacement } from '../enums/print-placement';
import type { PrintTechnology } from '../enums/print-technology';

/** Чисті дані конфігурації принта (для REST і збереження в БД). */
export interface PrintConfigurationData {
  printFileUrl: string;
  placement: PrintPlacement;
  technology: PrintTechnology;
  widthMm: number;
  heightMm: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface IPrintConfiguration extends PrintConfigurationData {
  validateBounds(maxWidthMm: number, maxHeightMm: number): boolean;
  validateFileFormat(extension: string, sizeBytes: number): boolean;
  calculatePrintCost(): number;
  getPlacement(): PrintPlacement;
  getTechnology(): PrintTechnology;
}
