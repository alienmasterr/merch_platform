import type { PrintPlacement } from '@merch/contracts';
import { Link, Navigate, useSearchParams } from 'react-router';
import { ApiError } from '../../api/errors';
import type { ApparelItem } from '../../api/types';
import { colorLabel, formatMoney } from '../../shared/format';
import { PLACEMENT_LABELS } from '../../shared/labels';
import { ErrorMessage, Loading } from '../../shared/QueryState';
import { useCatalogItem } from '../catalog/useCatalog';
import { PrintCanvas } from './PrintCanvas';
import { PrintControls } from './PrintControls';
import { AddToCart } from './AddToCart';
import { SavedProduct } from './SavedProduct';
import { useCustomizer } from './useCustomizer';

export function CustomizerPage() {
  const [params] = useSearchParams();
  const baseItemId = params.get('baseItemId') ?? undefined;
  const item = useCatalogItem(baseItemId);

  if (!baseItemId) return <Navigate to="/catalog" replace />;
  if (item.isPending) return <Loading />;
  if (item.isError) {
    if (item.error instanceof ApiError && item.error.status === 404) {
      return (
        <div className="card stack">
          <h1>Виріб не знайдено</h1>
          <Link to="/catalog">Обрати інший виріб</Link>
        </div>
      );
    }
    return <ErrorMessage error={item.error} onRetry={() => void item.refetch()} />;
  }
  if (!item.data.inStock) {
    return (
      <div className="card stack">
        <h1>{item.data.title}</h1>
        <p className="alert alert--warning">
          Цього виробу немає в наявності, його не можна кастомізувати.
        </p>
        <Link to="/catalog">Обрати інший виріб</Link>
      </div>
    );
  }
  return <Customizer key={item.data.id} baseItem={item.data} />;
}

function Customizer({ baseItem }: { baseItem: ApparelItem }) {
  const customizer = useCustomizer(baseItem);
  const { state, prints, saved, save } = customizer;
  const placements = baseItem.allowedPlacements as PrintPlacement[];

  return (
    <div className="stack">
      <div className="row">
        <h1 className="spacer">Конструктор</h1>
        <Link to={`/product/${baseItem.id}`} className="small">
          {baseItem.title}, {colorLabel(baseItem.color)}, {baseItem.size}
        </Link>
      </div>

      <div className="customizer-layout">
        <div className="card">
          <PrintCanvas
            baseItem={baseItem}
            state={state}
            onSelect={customizer.selectPlacement}
            onMove={customizer.moveBy}
          />
        </div>

        <div className="stack">
          <div className="card stack">
            <div className="tabs" role="tablist" aria-label="Зона нанесення">
              {placements.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={p === state.activePlacement}
                  className="tab"
                  onClick={() => customizer.selectPlacement(p)}
                >
                  {PLACEMENT_LABELS[p]}
                  {state.prints[p] && <span aria-label="є принт"> ●</span>}
                </button>
              ))}
            </div>
            <PrintControls customizer={customizer} />
          </div>

          <div className="card stack">
            {saved ? (
              <SavedProduct product={saved} actions={<AddToCart product={saved} />} />
            ) : (
              <>
                <div className="row">
                  <span className="spacer">
                    Орієнтовна ціна ({prints.length} {prints.length === 1 ? 'принт' : 'принтів'})
                  </span>
                  <span className="price" data-testid="estimate">
                    {formatMoney(customizer.estimate)}
                  </span>
                </div>
                {save.isError && <ErrorMessage error={save.error} />}
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={prints.length === 0 || save.isPending || customizer.upload.isPending}
                  onClick={() => save.mutate()}
                >
                  {save.isPending ? 'Збереження…' : 'Зберегти дизайн'}
                </button>
                {prints.length === 0 && <p className="small muted">Додайте хоча б один принт.</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
