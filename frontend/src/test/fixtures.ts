import type { ApparelItem, Category } from '../api/types';

export const categories: Category[] = [
  { id: 'cat-tshirts', name: 'Футболки', slug: 'tshirts' },
  { id: 'cat-hoodies', name: 'Худі', slug: 'hoodies' },
  { id: 'cat-accessories', name: 'Аксесуари', slug: 'accessories' },
];

const [tshirts, hoodies, accessories] = categories as [Category, Category, Category];

export const catalogItems: ApparelItem[] = [
  {
    id: 'tee-white-m',
    kind: 'TOP',
    title: 'Футболка базова',
    basePrice: 350,
    size: 'M',
    color: 'white',
    fabricComposition: '100% cotton',
    inStock: true,
    category: tshirts,
    productionCost: 30,
    allowedPlacements: ['CHEST', 'BACK', 'SLEEVE'],
    hasHood: false,
    hasPockets: false,
  },
  {
    id: 'tee-black-l',
    kind: 'TOP',
    title: 'Футболка базова',
    basePrice: 350,
    size: 'L',
    color: 'black',
    fabricComposition: '100% cotton',
    inStock: true,
    category: tshirts,
    productionCost: 30,
    allowedPlacements: ['CHEST', 'BACK', 'SLEEVE'],
    hasHood: false,
    hasPockets: false,
  },
  {
    id: 'hoodie-grey-l',
    kind: 'TOP',
    title: 'Худі оверсайз',
    basePrice: 900,
    size: 'L',
    color: 'grey',
    fabricComposition: '80% cotton, 20% polyester',
    inStock: false,
    category: hoodies,
    productionCost: 45,
    allowedPlacements: ['CHEST', 'BACK', 'SLEEVE'],
    hasHood: true,
    hasPockets: true,
  },
  {
    id: 'mug-white',
    kind: 'ACCESSORY',
    title: 'Чашка',
    basePrice: 180,
    size: 'ONE',
    color: 'white',
    fabricComposition: 'ceramic',
    inStock: true,
    category: accessories,
    productionCost: 10,
    allowedPlacements: ['ACCESSORY_FRONT'],
    accessoryType: 'mug',
  },
];

export function itemById(id: string): ApparelItem {
  const item = catalogItems.find((i) => i.id === id);
  if (!item) throw new Error(`fixture ${id} not found`);
  return item;
}
