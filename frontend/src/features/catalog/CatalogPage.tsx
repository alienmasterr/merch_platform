import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { listCatalog } from '../../api/catalog';
import type { CatalogFilter } from '../../api/types';
import { ErrorMessage, Loading } from '../../shared/QueryState';
import { CatalogFilters } from './CatalogFilters';
import {
  collectOptions,
  filterToParams,
  groupVariants,
  isFilterEmpty,
  parseFilter,
} from './filters';
import { ProductCard } from './ProductCard';
import { catalogKeys, useCatalog, useCategories } from './useCatalog';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.toString();
  const filter = useMemo(() => parseFilter(new URLSearchParams(query)), [query]);

  const results = useQuery({
    queryKey: catalogKeys.list(filter),
    queryFn: () => listCatalog(filter),
    placeholderData: keepPreviousData,
  });
  const all = useCatalog();
  const categories = useCategories();

  const options = useMemo(() => collectOptions(all.data ?? []), [all.data]);
  const groups = useMemo(() => groupVariants(results.data ?? []), [results.data]);

  const setFilter = (next: CatalogFilter) =>
    setSearchParams(filterToParams(next), { replace: true });

  return (
    <div className="stack">
      <div className="row">
        <h1 className="spacer">Каталог</h1>
        {results.isFetching && !results.isPending && (
          <span className="spinner" aria-label="Оновлення" />
        )}
      </div>
      <p className="muted">Оберіть базовий виріб, щоб нанести на нього власний принт.</p>

      <div className="catalog-layout">
        <CatalogFilters
          key={isFilterEmpty(filter) ? 'empty' : 'set'}
          filter={filter}
          categories={categories.data ?? []}
          options={options}
          onChange={setFilter}
        />

        <section aria-label="Товари" className="stack">
          {results.isPending && <Loading />}
          {results.isError && (
            <ErrorMessage error={results.error} onRetry={() => void results.refetch()} />
          )}
          {results.isSuccess && groups.length === 0 && (
            <div className="card stack">
              <p>За цими фільтрами нічого не знайдено.</p>
              <div>
                <button type="button" className="btn" onClick={() => setFilter({})}>
                  Скинути фільтри
                </button>
              </div>
            </div>
          )}
          {groups.length > 0 && (
            <>
              <p className="small muted">Знайдено товарів: {groups.length}</p>
              <div className="product-grid">
                {groups.map((g) => (
                  <ProductCard key={g.key} group={g} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
