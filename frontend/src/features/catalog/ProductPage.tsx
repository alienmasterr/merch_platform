import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '../../api/errors';
import type { ApparelItem } from '../../api/types';
import { colorLabel, colorSwatch, formatMoney } from '../../shared/format';
import { GarmentThumb } from '../../shared/Garment';
import { KIND_LABELS, PLACEMENT_LABELS } from '../../shared/labels';
import { ErrorMessage, Loading } from '../../shared/QueryState';
import { findVariant, sortSizes } from './filters';
import { useCatalog, useCatalogItem } from './useCatalog';

function kindDetails(item: ApparelItem): string[] {
  if (item.kind === 'TOP') {
    return [
      item.hasHood ? 'З капюшоном' : 'Без капюшона',
      item.hasPockets ? 'З кишенями' : 'Без кишень',
    ];
  }
  if (item.kind === 'BOTTOM')
    return [`Талія ${item.waistCm ?? '—'} см`, `Довжина ${item.lengthCm ?? '—'} см`];
  return item.accessoryType ? [`Тип: ${item.accessoryType}`] : [];
}

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const itemQuery = useCatalogItem(id);
  const item = itemQuery.data;
  const siblings = useCatalog(item ? { categoryId: item.category.id } : {});
  const variants = useMemo(
    () => (item ? (siblings.data ?? [item]).filter((v) => v.title === item.title) : []),
    [item, siblings.data],
  );

  if (itemQuery.isPending) return <Loading />;
  if (itemQuery.isError) {
    if (itemQuery.error instanceof ApiError && itemQuery.error.status === 404) {
      return (
        <div className="card stack">
          <h1>Товар не знайдено</h1>
          <p className="muted">Можливо, його прибрали з каталогу.</p>
          <Link to="/catalog">До каталогу</Link>
        </div>
      );
    }
    return <ErrorMessage error={itemQuery.error} onRetry={() => void itemQuery.refetch()} />;
  }
  if (!item) return null;

  const sizes = sortSizes(variants.map((v) => v.size));
  const colors = [...new Set(variants.map((v) => v.color.toLowerCase()))];
  const select = (wanted: { size: string; color: string }, keep: 'size' | 'color') => {
    const next = findVariant(variants, wanted, keep);
    if (next && next.id !== item.id) void navigate(`/product/${next.id}`, { replace: true });
  };
  const hasVariant = (size: string, color: string) =>
    variants.some((v) => v.size === size && v.color.toLowerCase() === color);

  return (
    <div className="stack">
      <nav className="small">
        <Link to="/catalog">Каталог</Link> /{' '}
        <Link to={`/catalog?categoryId=${item.category.id}`}>{item.category.name}</Link>
      </nav>
      <div className="product-layout">
        <div className="card product-image">
          <GarmentThumb item={item} label={`${item.title}, ${colorLabel(item.color)}`} />
        </div>

        <div className="card stack">
          <div className="row">
            <span className="badge">{KIND_LABELS[item.kind]}</span>
            {item.inStock ? (
              <span className="badge badge--success">В наявності</span>
            ) : (
              <span className="badge badge--danger">Немає в наявності</span>
            )}
          </div>
          <h1>{item.title}</h1>
          <p className="price product-price">{formatMoney(item.basePrice)}</p>
          <p className="small muted">
            + підготовка до друку {formatMoney(item.productionCost)}, вартість принта залежить від
            розміру й технології
          </p>

          <fieldset className="chip-group">
            <legend>Колір: {colorLabel(item.color)}</legend>
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className="chip"
                aria-pressed={color === item.color.toLowerCase()}
                onClick={() => select({ size: item.size, color }, 'color')}
              >
                <span
                  className="swatch"
                  style={{ background: colorSwatch(color) }}
                  aria-hidden="true"
                />
                {colorLabel(color)}
              </button>
            ))}
          </fieldset>

          <fieldset className="chip-group">
            <legend>Розмір: {item.size}</legend>
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                className="chip"
                aria-pressed={size === item.size}
                title={
                  hasVariant(size, item.color.toLowerCase()) ? undefined : 'Буде обрано інший колір'
                }
                onClick={() => select({ size, color: item.color }, 'size')}
              >
                {size}
              </button>
            ))}
          </fieldset>

          <dl className="details">
            <dt>Склад</dt>
            <dd>{item.fabricComposition || '—'}</dd>
            <dt>Особливості</dt>
            <dd>{kindDetails(item).join(', ') || '—'}</dd>
            <dt>Зони друку</dt>
            <dd>{item.allowedPlacements.map((p) => PLACEMENT_LABELS[p]).join(', ')}</dd>
          </dl>

          {item.inStock ? (
            <Link
              to={`/customizer?baseItemId=${encodeURIComponent(item.id)}`}
              className="btn btn--primary"
            >
              Створити дизайн
            </Link>
          ) : (
            <p className="alert alert--warning">
              Цього варіанту немає в наявності. Оберіть інший колір або розмір.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
