import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import type { CustomProduct } from '../../api/types';
import { useCart } from '../cart/cartContext';
import { customProductKey } from './useCustomProducts';

export function AddToCart({ product }: { product: CustomProduct }) {
  const { dispatch } = useCart();
  const queryClient = useQueryClient();
  const [added, setAdded] = useState(false);

  const add = () => {
    queryClient.setQueryData(customProductKey(product.id), product);
    dispatch({ type: 'add', customProductId: product.id });
    setAdded(true);
  };

  if (added) {
    return (
      <div className="row">
        <span className="spacer">Додано в кошик.</span>
        <Link to="/cart" className="btn btn--primary">
          Перейти в кошик
        </Link>
      </div>
    );
  }
  return (
    <button type="button" className="btn btn--primary" onClick={add}>
      Додати в кошик
    </button>
  );
}
