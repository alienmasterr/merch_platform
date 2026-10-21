import type { MerchApparelItem } from './merch-apparel-item';

export interface ApparelFilterProps {
  categoryId?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
}

export class ApparelFilter {
  readonly categoryId?: string;
  readonly size?: string;
  readonly color?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly inStockOnly: boolean;

  constructor(props: ApparelFilterProps = {}) {
    if (props.categoryId !== undefined) this.categoryId = props.categoryId;
    if (props.size !== undefined) this.size = props.size;
    if (props.color !== undefined) this.color = props.color;
    if (props.minPrice !== undefined) this.minPrice = props.minPrice;
    if (props.maxPrice !== undefined) this.maxPrice = props.maxPrice;
    this.inStockOnly = props.inStockOnly ?? false;
  }

  matches(item: MerchApparelItem): boolean {
    if (this.categoryId !== undefined && item.getCategory().getId() !== this.categoryId) return false;
    if (this.size !== undefined && item.getSize().toLowerCase() !== this.size.toLowerCase()) return false;
    if (this.color !== undefined && item.getColor().toLowerCase() !== this.color.toLowerCase()) return false;
    if (this.minPrice !== undefined && item.getBasePrice() < this.minPrice) return false;
    if (this.maxPrice !== undefined && item.getBasePrice() > this.maxPrice) return false;
    if (this.inStockOnly && !item.isInStock()) return false;
    return true;
  }
}
