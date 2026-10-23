import { useRole } from '../../app/useRole';
import { ErrorMessage, Loading } from '../../shared/QueryState';
import { useCatalog, useCategories } from '../catalog/useCatalog';
import { CatalogRow } from './CatalogRow';
import { CreateItemForm } from './CreateItemForm';

export function AdminPage() {
  const role = useRole();
  const catalog = useCatalog();
  const categories = useCategories();

  return (
    <div className="stack">
      <h1>Панель адміністратора</h1>
      {role !== 'admin' && (
        <p className="alert alert--warning">
          Оберіть роль «Адміністратор» у шапці. Без неї бекенд відхилить зміни (403).
        </p>
      )}

      <CreateItemForm categories={categories.data ?? []} />

      <section className="card stack" aria-label="Каталог">
        <h2>Каталог ({catalog.data?.length ?? 0})</h2>
        {catalog.isPending && <Loading />}
        {catalog.isError && (
          <ErrorMessage error={catalog.error} onRetry={() => void catalog.refetch()} />
        )}
        {catalog.data && (
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
                {catalog.data.map((item) => (
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
