import { ApparelKind, Category, type MerchApparelItem } from '@merch/contracts';
import { createApparelItem } from '../modules/catalog/domain/apparel-item-factory';

export const tees = new Category('cat-tees', 'Футболки', 'tees');

export function makeTee(overrides: { id?: string; basePrice?: number; size?: string; color?: string; inStock?: boolean } = {}): MerchApparelItem {
  return createApparelItem({
    id: 'tee-1',
    kind: ApparelKind.TOP,
    title: 'Tee',
    basePrice: 300,
    size: 'M',
    color: 'white',
    fabricComposition: 'cotton',
    inStock: true,
    category: tees,
    hasHood: false,
    hasPockets: false,
    ...overrides,
  });
}

export function makeHoodie(): MerchApparelItem {
  return createApparelItem({
    id: 'hoodie-1', kind: ApparelKind.TOP, title: 'Hoodie', basePrice: 900, size: 'L', color: 'grey',
    fabricComposition: 'cotton', inStock: true, category: tees, hasHood: true, hasPockets: true,
  });
}

export function makePants(lengthCm = 100): MerchApparelItem {
  return createApparelItem({
    id: 'pants-1', kind: ApparelKind.BOTTOM, title: 'Pants', basePrice: 700, size: 'M', color: 'black',
    fabricComposition: 'cotton', inStock: true, category: tees, waistCm: 80, lengthCm,
  });
}

export function makeMug(): MerchApparelItem {
  return createApparelItem({
    id: 'mug-1', kind: ApparelKind.ACCESSORY, title: 'Mug', basePrice: 150, size: 'ONE', color: 'white',
    fabricComposition: 'ceramic', inStock: true, category: tees, accessoryType: 'mug',
  });
}
