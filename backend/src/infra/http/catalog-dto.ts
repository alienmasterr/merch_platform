import {
  AccessoryItem,
  BottomWearItem,
  TopWearItem,
  type Category,
  type MerchApparelItem,
} from '@merch/contracts';

export function categoryToDto(category: Category) {
  return { id: category.getId(), name: category.getName(), slug: category.getSlug() };
}

export function itemToDto(item: MerchApparelItem) {
  const base = {
    id: item.getId(),
    kind: item.kind,
    title: item.getTitle(),
    basePrice: item.getBasePrice(),
    size: item.getSize(),
    color: item.getColor(),
    fabricComposition: item.getFabricComposition(),
    inStock: item.isInStock(),
    category: categoryToDto(item.getCategory()),
    productionCost: item.calculateProductionCost(),
    allowedPlacements: item.getAllowedPlacements(),
  };
  if (item instanceof TopWearItem) return { ...base, hasHood: item.hasHood, hasPockets: item.hasPockets };
  if (item instanceof BottomWearItem) return { ...base, waistCm: item.waistCm, lengthCm: item.lengthCm };
  if (item instanceof AccessoryItem) return { ...base, accessoryType: item.accessoryType };
  return base;
}
