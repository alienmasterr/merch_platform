import { describe, expect, it } from 'vitest';
import {
  cartReducer,
  cartTotal,
  CART_STORAGE_KEY,
  countItems,
  loadCart,
  MAX_CART_LINES,
  saveCart,
  type CartLine,
} from './cartStore';

const line = (id: string, quantity = 1): CartLine => ({ customProductId: id, quantity });

describe('cartReducer', () => {
  it('adds a new line', () => {
    expect(cartReducer([], { type: 'add', customProductId: 'a' })).toEqual([line('a')]);
  });

  it('increases quantity when the same product is added again', () => {
    expect(cartReducer([line('a', 2)], { type: 'add', customProductId: 'a', quantity: 3 })).toEqual(
      [line('a', 5)],
    );
  });

  it('clamps quantity to 1..100', () => {
    expect(
      cartReducer([line('a')], { type: 'setQuantity', customProductId: 'a', quantity: 0 }),
    ).toEqual([line('a', 1)]);
    expect(
      cartReducer([line('a')], { type: 'setQuantity', customProductId: 'a', quantity: 500 }),
    ).toEqual([line('a', 100)]);
    expect(
      cartReducer([line('a')], { type: 'setQuantity', customProductId: 'a', quantity: Number.NaN }),
    ).toEqual([line('a', 1)]);
  });

  it('does not exceed the line limit', () => {
    const full = Array.from({ length: MAX_CART_LINES }, (_, i) => line(`p${i}`));
    expect(cartReducer(full, { type: 'add', customProductId: 'extra' })).toBe(full);
  });

  it('removes and clears lines', () => {
    expect(cartReducer([line('a'), line('b')], { type: 'remove', customProductId: 'a' })).toEqual([
      line('b'),
    ]);
    expect(cartReducer([line('a')], { type: 'clear' })).toEqual([]);
  });
});

describe('totals', () => {
  it('counts items and sums known prices', () => {
    const lines = [line('a', 2), line('b', 1), line('c', 4)];
    expect(countItems(lines)).toBe(7);
    expect(cartTotal(lines, { a: 100.5, b: 50 })).toBe(251);
  });
});

describe('persistence', () => {
  it('round-trips through storage', () => {
    saveCart([line('a', 3)], localStorage);
    expect(loadCart(localStorage)).toEqual([line('a', 3)]);
  });

  it('drops broken data', () => {
    localStorage.setItem(CART_STORAGE_KEY, '{oops');
    expect(loadCart(localStorage)).toEqual([]);
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ customProductId: 'a', quantity: 2 }, { foo: 1 }, 'x']),
    );
    expect(loadCart(localStorage)).toEqual([line('a', 2)]);
  });

  it('survives a missing storage', () => {
    expect(loadCart(undefined)).toEqual([]);
    expect(() => saveCart([line('a')], undefined)).not.toThrow();
  });
});
