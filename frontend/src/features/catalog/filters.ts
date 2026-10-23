import type { ApparelItem, CatalogFilter, Category } from '../../api/types';

/** Читає фільтр каталогу з query-параметрів URL. Некоректні числа ігноруються. */
export function parseFilter(params: URLSearchParams): CatalogFilter {
  const filter: CatalogFilter = {};
  const text = (key: 'categoryId' | 'size' | 'color') => {
    const value = params.get(key)?.trim();
    if (value) filter[key] = value;
  };
  text('categoryId');
  text('size');
  text('color');
  for (const key of ['minPrice', 'maxPrice'] as const) {
    const raw = params.get(key);
    if (raw === null || raw.trim() === '') continue;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0) filter[key] = value;
  }
  if (params.get('inStockOnly') === 'true') filter.inStockOnly = true;
  return filter;
}

/** Зворотне перетворення: лише задані значення потрапляють в URL. */
export function filterToParams(filter: CatalogFilter): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ['categoryId', 'size', 'color'] as const) {
    const value = filter[key];
    if (value) params.set(key, value);
  }
  for (const key of ['minPrice', 'maxPrice'] as const) {
    const value = filter[key];
    if (value !== undefined) params.set(key, String(value));
  }
  if (filter.inStockOnly) params.set('inStockOnly', 'true');
  return params;
}

export function isFilterEmpty(filter: CatalogFilter): boolean {
  return filterToParams(filter).toString() === '';
}

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'ONE'];

/** Сортує розміри у звичному порядку (XS < S < M …), невідомі в кінці за алфавітом. */
export function sortSizes(sizes: Iterable<string>): string[] {
  const rank = (s: string) => {
    const i = SIZE_ORDER.indexOf(s.toUpperCase());
    return i < 0 ? SIZE_ORDER.length : i;
  };
  return [...new Set(sizes)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export interface FilterOptions {
  sizes: string[];
  colors: string[];
}

export function collectOptions(items: ApparelItem[]): FilterOptions {
  return {
    sizes: sortSizes(items.map((i) => i.size)),
    colors: [...new Set(items.map((i) => i.color.toLowerCase()))].sort(),
  };
}

/**
 * Товар у вітрині: у каталозі кожен варіант (розмір × колір) окремий запис,
 * тому групуємо їх за назвою в межах категорії.
 */
export interface ProductGroup {
  key: string;
  title: string;
  category: Category;
  kind: ApparelItem['kind'];
  minPrice: number;
  sizes: string[];
  colors: string[];
  variants: ApparelItem[];
  inStock: boolean;
  /** Варіант, який відкриваємо за замовчуванням: перший у наявності. */
  primary: ApparelItem;
}

export function groupVariants(items: ApparelItem[]): ProductGroup[] {
  const groups = new Map<string, ApparelItem[]>();
  for (const item of items) {
    const key = `${item.category.id}::${item.title}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].map(([key, variants]) => {
    const first = variants[0] as ApparelItem;
    return {
      key,
      title: first.title,
      category: first.category,
      kind: first.kind,
      minPrice: Math.min(...variants.map((v) => v.basePrice)),
      sizes: sortSizes(variants.map((v) => v.size)),
      colors: [...new Set(variants.map((v) => v.color.toLowerCase()))],
      variants,
      inStock: variants.some((v) => v.inStock),
      primary: variants.find((v) => v.inStock) ?? first,
    };
  });
}

/**
 * Варіант товару з потрібним розміром і кольором. Якщо точного збігу немає, обов'язково
 * зберігаємо атрибут, який щойно обрав користувач (`keep`), а інший підбираємо будь-який.
 */
export function findVariant(
  variants: ApparelItem[],
  wanted: { size: string; color: string },
  keep: 'size' | 'color',
): ApparelItem | undefined {
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  return (
    variants.find((v) => same(v.size, wanted.size) && same(v.color, wanted.color)) ??
    variants.find((v) => same(v[keep], wanted[keep]))
  );
}
