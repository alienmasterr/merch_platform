import type { CustomProduct } from '../../api/types';
import { CANVAS } from '../../shared/canvas';
import { GarmentShape } from '../../shared/Garment';
import { calculatePosition, viewOf } from './placement';

export function ProductMockup({
  product,
  className = 'mockup',
  view: forcedView,
}: {
  product: CustomProduct;
  className?: string;
  view?: 'front' | 'back';
}) {
  const view =
    forcedView ?? (product.prints.every((p) => viewOf(p.placement) === 'back') ? 'back' : 'front');
  const visible = product.prints.filter((p) => viewOf(p.placement) === view);
  return (
    <svg
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      className={className}
      role="img"
      aria-label={`Мокап: ${product.baseItem.title}, ${view === 'back' ? 'ззаду' : 'спереду'}`}
    >
      <GarmentShape item={product.baseItem} view={view} />
      {visible.map((p) => (
        <image
          key={p.placement}
          href={p.printFileUrl}
          {...calculatePosition(p, p.placement)}
          preserveAspectRatio="xMidYMid meet"
        />
      ))}
    </svg>
  );
}
