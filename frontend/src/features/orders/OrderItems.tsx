import type { Order } from '../../api/types';
import { colorLabel, formatMoney } from '../../shared/format';
import { PLACEMENT_LABELS } from '../../shared/labels';
import { ProductMockup } from '../customizer/ProductMockup';
import { useCustomProducts } from '../customizer/useCustomProducts';

export function OrderItems({ order }: { order: Order }) {
  const products = useCustomProducts(order.items.map((i) => i.customProductId));
  return (
    <ul className="stack cart-lines" aria-label="Позиції замовлення">
      {order.items.map((item) => {
        const product = products.byId[item.customProductId];
        return (
          <li key={item.customProductId} className="order-item">
            {product ? (
              <ProductMockup product={product} className="cart-line__image" />
            ) : (
              <div className="cart-line__image" />
            )}
            <div className="stack cart-line__info">
              <strong>{product?.baseItem.title ?? 'Виріб'}</strong>
              {product && (
                <span className="small muted">
                  {colorLabel(product.baseItem.color)}, {product.baseItem.size} · принти:{' '}
                  {product.prints.map((p) => PLACEMENT_LABELS[p.placement]).join(', ')}
                </span>
              )}
              <span className="small">
                {item.quantity} × {formatMoney(item.unitPrice)}
              </span>
            </div>
            <span className="price">{formatMoney(item.lineTotal)}</span>
          </li>
        );
      })}
    </ul>
  );
}
