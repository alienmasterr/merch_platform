/** Обмеження з API (POST /orders): до 20 позицій, кількість 1..100. */
export const MAX_CART_LINES = 20;
export const MAX_QUANTITY = 100;
export const CART_STORAGE_KEY = 'merch.cart.v1';

export interface CartLine {
  customProductId: string;
  quantity: number;
}

export type CartAction =
  | { type: 'add'; customProductId: string; quantity?: number }
  | { type: 'setQuantity'; customProductId: string; quantity: number }
  | { type: 'remove'; customProductId: string }
  | { type: 'clear' }
  /** Повна заміна (зміни з іншої вкладки). */
  | { type: 'replace'; lines: CartLine[] };

const clampQuantity = (q: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.round(q) || 1));

/** Чистий редюсер кошика. Той самий виріб не дублюється, а збільшує кількість. */
export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add': {
      const existing = lines.find((l) => l.customProductId === action.customProductId);
      if (existing) {
        return lines.map((l) =>
          l === existing
            ? { ...l, quantity: clampQuantity(l.quantity + (action.quantity ?? 1)) }
            : l,
        );
      }
      if (lines.length >= MAX_CART_LINES) return lines;
      return [
        ...lines,
        { customProductId: action.customProductId, quantity: clampQuantity(action.quantity ?? 1) },
      ];
    }
    case 'setQuantity':
      return lines.map((l) =>
        l.customProductId === action.customProductId
          ? { ...l, quantity: clampQuantity(action.quantity) }
          : l,
      );
    case 'remove':
      return lines.filter((l) => l.customProductId !== action.customProductId);
    case 'clear':
      return [];
    case 'replace':
      return action.lines;
  }
}

export function countItems(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

/** Сума кошика за цінами з бекенду; позиції без відомої ціни пропускаються. */
export function cartTotal(lines: CartLine[], prices: Record<string, number | undefined>): number {
  const total = lines.reduce((sum, l) => sum + (prices[l.customProductId] ?? 0) * l.quantity, 0);
  return Math.round(total * 100) / 100;
}

/** Читає кошик з localStorage, відкидаючи пошкоджені записи. */
export function loadCart(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): CartLine[] {
  try {
    const raw: unknown = JSON.parse(storage?.getItem(CART_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (l): l is CartLine =>
          typeof l === 'object' &&
          l !== null &&
          typeof (l as CartLine).customProductId === 'string' &&
          typeof (l as CartLine).quantity === 'number',
      )
      .slice(0, MAX_CART_LINES)
      .map((l) => ({ customProductId: l.customProductId, quantity: clampQuantity(l.quantity) }));
  } catch {
    return [];
  }
}

export function saveCart(
  lines: CartLine[],
  storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage,
) {
  try {
    storage?.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // приватний режим або переповнене сховище: кошик просто не переживе перезавантаження
  }
}
