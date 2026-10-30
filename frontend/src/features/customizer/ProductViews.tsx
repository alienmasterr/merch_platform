import type { CustomProduct } from '../../api/types';
import { viewOf } from './placement';
import { ProductMockup } from './ProductMockup';

/**
 * Усі сторони виробу з принтами: перед і, якщо є принт на спині, зад поруч.
 * Малюється з параметрів друку, тож завжди збігається з тим, що підтвердив покупець.
 */
export function ProductViews({ product }: { product: CustomProduct }) {
  const hasFront = product.prints.some((p) => viewOf(p.placement) === 'front');
  const hasBack = product.prints.some((p) => viewOf(p.placement) === 'back');
  const views: ('front' | 'back')[] =
    hasBack && !hasFront ? ['back'] : hasBack ? ['front', 'back'] : ['front'];
  return (
    <div className="product-views">
      {views.map((view) => (
        <figure key={view} className="product-views__item">
          <ProductMockup product={product} view={view} />
          <figcaption className="small muted">{view === 'back' ? 'Ззаду' : 'Спереду'}</figcaption>
        </figure>
      ))}
    </div>
  );
}
