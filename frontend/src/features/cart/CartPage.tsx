import { Link, useNavigate } from 'react-router';
import { ApiError } from '../../api/errors';
import type { CustomProduct } from '../../api/types';
import { colorLabel, formatMoney } from '../../shared/format';
import { PLACEMENT_LABELS } from '../../shared/labels';
import { ErrorMessage, Loading } from '../../shared/QueryState';
import { ProductMockup } from '../customizer/ProductMockup';
import { RecentOrders } from '../orders/RecentOrders';
import { useCustomProducts } from '../customizer/useCustomProducts';
import { useCart } from './cartContext';
import { cartTotal, countItems, MAX_QUANTITY, type CartLine } from './cartStore';

export function CartPage() {
  const { lines, dispatch } = useCart();
  const navigate = useNavigate();
  const products = useCustomProducts(lines.map((l) => l.customProductId));

  if (lines.length === 0) {
    return (
      <div className="stack">
        <div className="card stack">
          <h1>Кошик</h1>
          <p className="muted">
            Кошик порожній. Створіть дизайн у конструкторі й додайте його сюди.
          </p>
          <div>
            <Link to="/catalog" className="btn btn--primary">
              До каталогу
            </Link>
          </div>
        </div>
        <RecentOrders />
      </div>
    );
  }

  const prices = Object.fromEntries(
    lines.map((l) => [l.customProductId, products.byId[l.customProductId]?.totalCost]),
  );
  const broken = lines.filter((l) => products.errors[l.customProductId]);
  const total = cartTotal(lines, prices);
  const ready = !products.isPending && broken.length === 0;

  return (
    <div className="stack">
      <h1>Кошик</h1>
      <div className="cart-layout">
        <ul className="stack cart-lines" aria-label="Позиції кошика">
          {lines.map((line) => (
            <CartLineRow
              key={line.customProductId}
              line={line}
              product={products.byId[line.customProductId]}
              error={products.errors[line.customProductId]}
              onQuantity={(quantity) =>
                dispatch({ type: 'setQuantity', customProductId: line.customProductId, quantity })
              }
              onRemove={() => dispatch({ type: 'remove', customProductId: line.customProductId })}
            />
          ))}
        </ul>

        <aside className="card stack cart-summary">
          <h2>Разом</h2>
          <div className="row">
            <span className="spacer">Товарів</span>
            <span>{countItems(lines)}</span>
          </div>
          <div className="row">
            <span className="spacer">Сума без доставки</span>
            <span className="price" data-testid="cart-total">
              {products.isPending ? '…' : formatMoney(total)}
            </span>
          </div>
          <p className="small muted">Доставку Новою Поштою розрахуємо на наступному кроці.</p>
          {broken.length > 0 && (
            <p className="alert alert--warning small">
              Приберіть недоступні позиції, щоб оформити замовлення.
            </p>
          )}
          <button
            type="button"
            className="btn btn--primary"
            disabled={!ready}
            onClick={() => void navigate('/checkout')}
          >
            Оформити замовлення
          </button>
          <Link to="/catalog" className="small">
            Продовжити покупки
          </Link>
        </aside>
      </div>
    </div>
  );
}

interface RowProps {
  line: CartLine;
  product: CustomProduct | undefined;
  error: unknown;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}

function CartLineRow({ line, product, error, onQuantity, onRemove }: RowProps) {
  const remove = (
    <button type="button" className="btn btn--small btn--danger" onClick={onRemove}>
      Видалити
    </button>
  );

  if (error) {
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <li className="card row">
        <div className="spacer">
          {missing ? 'Цей виріб більше недоступний.' : <ErrorMessage error={error} />}
        </div>
        {remove}
      </li>
    );
  }
  if (!product) {
    return (
      <li className="card">
        <Loading />
      </li>
    );
  }

  const { baseItem } = product;
  return (
    <li className="card cart-line">
      <ProductMockup product={product} className="cart-line__image" />
      <div className="stack cart-line__info">
        <strong>{baseItem.title}</strong>
        <span className="small muted">
          {colorLabel(baseItem.color)}, {baseItem.size} · принти:{' '}
          {product.prints.map((p) => PLACEMENT_LABELS[p.placement]).join(', ')}
        </span>
        <span className="small">{formatMoney(product.totalCost)} / шт.</span>
      </div>
      <div className="stack cart-line__actions">
        <div className="qty" role="group" aria-label="Кількість">
          <button
            type="button"
            className="btn btn--small"
            aria-label="Менше"
            disabled={line.quantity <= 1}
            onClick={() => onQuantity(line.quantity - 1)}
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={MAX_QUANTITY}
            value={line.quantity}
            aria-label="Кількість"
            onChange={(e) => onQuantity(Number(e.target.value))}
          />
          <button
            type="button"
            className="btn btn--small"
            aria-label="Більше"
            disabled={line.quantity >= MAX_QUANTITY}
            onClick={() => onQuantity(line.quantity + 1)}
          >
            +
          </button>
        </div>
        <span className="price">{formatMoney(product.totalCost * line.quantity)}</span>
        {remove}
      </div>
    </li>
  );
}
