import { ValidationError } from '../errors';
import type { ApparelKind } from '../enums/apparel-kind';
import type { PrintPlacement } from '../enums/print-placement';
import type { Category } from './category';

export interface MerchApparelItemProps {
  id: string;
  title: string;
  basePrice: number;
  size: string;
  color: string;
  fabricComposition: string;
  inStock: boolean;
  category: Category;
}

export abstract class MerchApparelItem {
  abstract readonly kind: ApparelKind;

  private readonly id: string;
  private readonly title: string;
  private basePrice: number;
  private readonly size: string;
  private readonly color: string;
  private readonly fabricComposition: string;
  private inStock: boolean;
  private readonly category: Category;

  protected constructor(props: MerchApparelItemProps) {
    if (!props.id.trim()) throw new ValidationError('Item id is required');
    if (!props.title.trim()) throw new ValidationError('Item title is required');
    MerchApparelItem.assertPrice(props.basePrice);
    this.id = props.id;
    this.title = props.title;
    this.basePrice = props.basePrice;
    this.size = props.size;
    this.color = props.color;
    this.fabricComposition = props.fabricComposition;
    this.inStock = props.inStock;
    this.category = props.category;
  }

  private static assertPrice(price: number): void {
    if (!Number.isFinite(price) || price < 0) {
      throw new ValidationError('Price must be a non-negative number');
    }
  }

  abstract calculateProductionCost(): number;
  abstract getAllowedPlacements(): PrintPlacement[];

  getId(): string {
    return this.id;
  }

  getTitle(): string {
    return this.title;
  }

  getBasePrice(): number {
    return this.basePrice;
  }

  getSize(): string {
    return this.size;
  }

  getColor(): string {
    return this.color;
  }

  getFabricComposition(): string {
    return this.fabricComposition;
  }

  getCategory(): Category {
    return this.category;
  }

  isInStock(): boolean {
    return this.inStock;
  }

  setBasePrice(price: number): void {
    MerchApparelItem.assertPrice(price);
    this.basePrice = price;
  }

  setInStock(inStock: boolean): void {
    this.inStock = inStock;
  }
}
