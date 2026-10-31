import { NavLink } from 'react-router';
import { useCart } from './cartContext';
import { countItems } from './cartStore';

export function CartLink() {
  const { lines } = useCart();
  const count = countItems(lines);
  return (
    <NavLink to="/cart">
      Кошик
      {count > 0 && (
        <span className="badge badge--accent nav-count" aria-label={`товарів: ${count}`}>
          {count}
        </span>
      )}
    </NavLink>
  );
}
