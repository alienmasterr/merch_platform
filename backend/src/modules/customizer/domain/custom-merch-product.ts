import {
  ValidationError,
  type ICustomMerchProduct,
  type IPrintConfiguration,
  type MerchApparelItem,
} from '@merch/contracts';

export interface CustomMerchProductProps {
  id: string;
  baseItem: MerchApparelItem;
  printConfigs: IPrintConfiguration[];
  previewImageUrl?: string | null;
  mockupApproved?: boolean;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export class CustomMerchProduct implements ICustomMerchProduct {
  private readonly id: string;
  private readonly baseItem: MerchApparelItem;
  private readonly printConfigs: IPrintConfiguration[];
  private previewImageUrl: string | null;
  private mockupApproved: boolean;

  constructor(props: CustomMerchProductProps) {
    this.id = props.id;
    this.baseItem = props.baseItem;
    this.printConfigs = [...props.printConfigs];
    this.previewImageUrl = props.previewImageUrl ?? null;
    this.mockupApproved = props.mockupApproved ?? false;
  }

  getId(): string {
    return this.id;
  }

  getBaseItem(): MerchApparelItem {
    return this.baseItem;
  }

  getPrintConfigs(): IPrintConfiguration[] {
    return [...this.printConfigs];
  }

  getPreviewImageUrl(): string | null {
    return this.previewImageUrl;
  }

  isMockupApproved(): boolean {
    return this.mockupApproved;
  }

  /** Ціна виробу + підготовка до друку + вартість кожного принта. */
  getTotalCost(): number {
    const prints = this.printConfigs.reduce((sum, c) => sum + c.calculatePrintCost(), 0);
    return round2(this.baseItem.getBasePrice() + this.baseItem.calculateProductionCost() + prints);
  }

  setPreviewImageUrl(url: string): void {
    if (!url.trim()) throw new ValidationError('Preview url must not be empty');
    this.previewImageUrl = url;
  }

  setApprovalStatus(approved: boolean): void {
    this.mockupApproved = approved;
  }
}
