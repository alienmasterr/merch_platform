import {
  AccessoryItem,
  ApparelKind,
  BottomWearItem,
  TopWearItem,
  type Category,
  type MerchApparelItem,
} from '@merch/contracts';

interface BaseSpec {
  id: string;
  title: string;
  basePrice: number;
  size: string;
  color: string;
  fabricComposition: string;
  inStock: boolean;
  category: Category;
}

export type ApparelItemSpec =
  | (BaseSpec & { kind: typeof ApparelKind.TOP; hasHood: boolean; hasPockets: boolean })
  | (BaseSpec & { kind: typeof ApparelKind.BOTTOM; waistCm: number; lengthCm: number })
  | (BaseSpec & { kind: typeof ApparelKind.ACCESSORY; accessoryType: string });

export function createApparelItem(spec: ApparelItemSpec): MerchApparelItem {
  switch (spec.kind) {
    case ApparelKind.TOP:
      return new TopWearItem(spec);
    case ApparelKind.BOTTOM:
      return new BottomWearItem(spec);
    case ApparelKind.ACCESSORY:
      return new AccessoryItem(spec);
  }
}
