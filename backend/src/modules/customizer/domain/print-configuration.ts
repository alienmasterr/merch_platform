import {
  PRINT_PLACEMENTS,
  PRINT_TECHNOLOGIES,
  PrintTechnology,
  ValidationError,
  type IPrintConfiguration,
  type PrintConfigurationData,
  type PrintPlacement,
} from '@merch/contracts';
import { isAllowedPrintFile } from './print-file-rules';

const RATE_PER_CM2: Record<PrintTechnology, number> = {
  [PrintTechnology.DTG]: 0.25,
  [PrintTechnology.DTF]: 0.2,
  [PrintTechnology.EMBROIDERY]: 0.6,
  [PrintTechnology.SUBLIMATION]: 0.15,
};
const MIN_PRINT_COST = 15;

const round2 = (n: number): number => Math.round(n * 100) / 100;

export class PrintConfiguration implements IPrintConfiguration {
  readonly printFileUrl: string;
  readonly placement: PrintPlacement;
  readonly technology: PrintTechnology;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;

  constructor(data: PrintConfigurationData) {
    if (!data.printFileUrl.trim()) throw new ValidationError('printFileUrl is required');
    if (!PRINT_PLACEMENTS.includes(data.placement)) throw new ValidationError(`Unknown placement: ${data.placement}`);
    if (!PRINT_TECHNOLOGIES.includes(data.technology)) throw new ValidationError(`Unknown technology: ${data.technology}`);
    if (!(data.widthMm > 0) || !(data.heightMm > 0)) throw new ValidationError('widthMm and heightMm must be positive');
    if (!(data.scale > 0) || !Number.isFinite(data.scale)) throw new ValidationError('scale must be positive');
    if (!Number.isFinite(data.offsetX) || !Number.isFinite(data.offsetY)) throw new ValidationError('offsets must be finite numbers');

    this.printFileUrl = data.printFileUrl;
    this.placement = data.placement;
    this.technology = data.technology;
    this.widthMm = data.widthMm;
    this.heightMm = data.heightMm;
    this.offsetX = data.offsetX;
    this.offsetY = data.offsetY;
    this.scale = data.scale;
  }

  validateBounds(maxWidthMm: number, maxHeightMm: number): boolean {
    const w = this.widthMm * this.scale;
    const h = this.heightMm * this.scale;
    return (
      Math.abs(this.offsetX) + w / 2 <= maxWidthMm / 2 &&
      Math.abs(this.offsetY) + h / 2 <= maxHeightMm / 2
    );
  }

  validateFileFormat(extension: string, sizeBytes: number): boolean {
    return isAllowedPrintFile(extension, sizeBytes);
  }

  calculatePrintCost(): number {
    const areaCm2 = ((this.widthMm * this.scale) / 10) * ((this.heightMm * this.scale) / 10);
    return round2(Math.max(MIN_PRINT_COST, areaCm2 * RATE_PER_CM2[this.technology]));
  }

  getPlacement(): PrintPlacement {
    return this.placement;
  }

  getTechnology(): PrintTechnology {
    return this.technology;
  }

  toData(): PrintConfigurationData {
    return {
      printFileUrl: this.printFileUrl,
      placement: this.placement,
      technology: this.technology,
      widthMm: this.widthMm,
      heightMm: this.heightMm,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      scale: this.scale,
    };
  }
}
