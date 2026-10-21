import { ApparelKind, Category, type ICatalogRepository } from '@merch/contracts';
import { createApparelItem } from '../domain/apparel-item-factory';

/** Стартові дані каталогу: використовуються і в in-memory режимі, і в `npm run seed` для Postgres. */
export async function seedCatalog(repo: ICatalogRepository): Promise<void> {
  const tees = new Category('cat-tshirts', 'Футболки', 'tshirts');
  const hoodies = new Category('cat-hoodies', 'Худі', 'hoodies');
  const pants = new Category('cat-pants', 'Штани', 'pants');
  const accessories = new Category('cat-accessories', 'Аксесуари', 'accessories');
  for (const c of [tees, hoodies, pants, accessories]) await repo.saveCategory(c);

  const common = { fabricComposition: '100% cotton', inStock: true };
  const items = [
    createApparelItem({ ...common, id: 'tee-white-m', kind: ApparelKind.TOP, title: 'Футболка базова', basePrice: 350, size: 'M', color: 'white', category: tees, hasHood: false, hasPockets: false }),
    createApparelItem({ ...common, id: 'tee-black-l', kind: ApparelKind.TOP, title: 'Футболка базова', basePrice: 350, size: 'L', color: 'black', category: tees, hasHood: false, hasPockets: false }),
    createApparelItem({ ...common, id: 'hoodie-grey-l', kind: ApparelKind.TOP, title: 'Худі оверсайз', basePrice: 900, size: 'L', color: 'grey', fabricComposition: '80% cotton, 20% polyester', category: hoodies, hasHood: true, hasPockets: true }),
    createApparelItem({ ...common, id: 'pants-black-m', kind: ApparelKind.BOTTOM, title: 'Джогери', basePrice: 750, size: 'M', color: 'black', category: pants, waistCm: 80, lengthCm: 102 }),
    createApparelItem({ ...common, id: 'totebag-natural', kind: ApparelKind.ACCESSORY, title: 'Шопер', basePrice: 200, size: 'ONE', color: 'natural', category: accessories, accessoryType: 'tote-bag' }),
    createApparelItem({ ...common, id: 'mug-white', kind: ApparelKind.ACCESSORY, title: 'Чашка', basePrice: 180, size: 'ONE', color: 'white', fabricComposition: 'ceramic', category: accessories, accessoryType: 'mug' }),
  ];
  for (const item of items) await repo.save(item);
}
