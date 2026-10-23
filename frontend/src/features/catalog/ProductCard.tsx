import { Link } from 'react-router';
import { colorLabel, colorSwatch, formatMoney } from '../../shared/format';
import { GarmentThumb } from '../../shared/Garment';
import type { ProductGroup } from './filters';

export function ProductCard({ group }: { group: ProductGroup }) {
  return (
    <article className="card product-card">
      <Link to={`/product/${group.primary.id}`} className="product-card__link">
        <div className="product-card__image">
          <GarmentThumb item={group.primary} label={group.title} />
        </div>
        <div className="stack product-card__body">
          <div className="row">
            <span className="badge">{group.category.name}</span>
            {!group.inStock && <span className="badge badge--danger">Немає в наявності</span>}
          </div>
          <h3>{group.title}</h3>
          <div className="row small muted">
            {group.colors.map((c) => (
              <span
                key={c}
                className="swatch"
                title={colorLabel(c)}
                style={{ background: colorSwatch(c) }}
              />
            ))}
            <span>{group.sizes.join(' · ')}</span>
          </div>
          <span className="price">
            {group.variants.length > 1 ? 'від ' : ''}
            {formatMoney(group.minPrice)}
          </span>
        </div>
      </Link>
    </article>
  );
}
