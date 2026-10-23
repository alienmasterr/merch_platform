import { createContext, useContext } from 'react';
import type { CartAction, CartLine } from './cartStore';

export interface CartContextValue {
  lines: CartLine[];
  dispatch: (action: CartAction) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside <CartProvider>');
  return value;
}
