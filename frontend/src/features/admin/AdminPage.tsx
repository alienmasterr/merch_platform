import { useMemo, useState } from 'react';
import type { ApparelItem } from '../../api/types';
import { ErrorMessage, Loading } from '../../shared/QueryState';
import { useCatalog, useCategories } from '../catalog/useCatalog';
import { AdminFilters } from './AdminFilters';
import { EMPTY_ADMIN_FILTER, filterAdminItems, type AdminFilter } from './catalogFilter';
import { CatalogRow } from './CatalogRow';
import { CreateItemForm } from './CreateItemForm';

export function AdminPage() {
  const catalog = useCatalog();
  const categories = useCategories();
  const [filter, setFilter] = useState<AdminFilter>(EMPTY_ADMIN_FILTER);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<ApparelItem | null>(null);

  const items = useMemo(() => catalog.data ?? [], [catalog.data]);
  const visible = useMemo(() => filterAdminItems(items, filter), [items, filter]);

  return (
    <div className="stack">
      <div className="row">
        <h1 className="spacer">Панель адміністратора</h1>
        {!adding && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setAdding(true);
              setCreated(null);
            }}
          >
            <span aria-hidden="true">+</span> Додати товар
          </button>
        )}
      </div>

      {adding && (
        <CreateItemForm
          categories={categories.data ?? []}
          items={items}
          onCreated={(item) => {
            setCreated(item);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {created && (
        <p className="alert alert--success" role="status">
          Додано «{created.title}» ({created.id}).
        </p>
      )}

      <AdminFilters
        filter={filter}
        categories={categories.data ?? []}
        items={items}
        onChange={setFilter}
      />

      <section className="card stack" aria-label="Каталог">
        <h2>
          Каталог{' '}
          <span className="muted small">
            {visible.length === items.length ? items.length : `${visible.length} з ${items.length}`}
          </span>
        </h2>
        {catalog.isPending && <Loading />}
        {catalog.isError && (
          <ErrorMessage error={catalog.error} onRetry={() => void catalog.refetch()} />
        )}
        {catalog.isSuccess && visible.length === 0 && (
          <p className="muted">За цими фільтрами товарів немає.</p>
        )}
        {visible.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Категорія</th>
                  <th>Варіант</th>
                  <th>Ціна, грн</th>
                  <th>В наявності</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <CatalogRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
