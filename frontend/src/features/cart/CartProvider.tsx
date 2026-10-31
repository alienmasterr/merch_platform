import { useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { CartContext } from './cartContext';
import { cartReducer, CART_STORAGE_KEY, loadCart, saveCart } from './cartStore';

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, undefined, () => loadCart());

  useEffect(() => saveCart(lines), [lines]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CART_STORAGE_KEY) return;
      dispatch({ type: 'replace', lines: loadCart() });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ lines, dispatch }), [lines]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
