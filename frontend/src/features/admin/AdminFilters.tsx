import type { ApparelItem, Category } from '../../api/types';
import { KIND_LABELS } from '../../shared/labels';
import {
  categoriesForKind,
  EMPTY_ADMIN_FILTER,
  isAdminFilterEmpty,
  type AdminFilter,
  type Kind,
  type StockFilter,
} from './catalogFilter';

interface Props {
  filter: AdminFilter;
  categories: Category[];
  items: ApparelItem[];
  onChange: (filter: AdminFilter) => void;
}

/** Фільтри таблиці каталогу в панелі адміна. Категорії обмежуються обраним типом. */
export function AdminFilters({ filter, categories, items, onChange }: Props) {
  const allowed = categoriesForKind(filter.kind, categories, items);
  const set = (patch: Partial<AdminFilter>) => onChange({ ...filter, ...patch });

  const changeKind = (kind: Kind | '') => {
    const keep = categoriesForKind(kind, categories, items).some((c) => c.id === filter.categoryId);
    set({ kind, categoryId: keep ? filter.categoryId : '' });
  };

  return (
    <div className="card admin-filters" role="search" aria-label="Фільтри каталогу">
      <div className="field admin-filters__search">
        <label htmlFor="admin-q">Пошук</label>
        <input
          id="admin-q"
          type="search"
          placeholder="Назва, id, колір або розмір"
          value={filter.query}
          onChange={(e) => set({ query: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="admin-kind">Тип</label>
        <select
          id="admin-kind"
          value={filter.kind}
          onChange={(e) => changeKind(e.target.value as Kind | '')}
        >
          <option value="">Усі типи</option>
          {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="admin-category">Категорія</label>
        <select
          id="admin-category"
          value={filter.categoryId}
          onChange={(e) => set({ categoryId: e.target.value })}
        >
          <option value="">Усі категорії</option>
          {allowed.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="admin-stock">Наявність</label>
        <select
          id="admin-stock"
          value={filter.stock}
          onChange={(e) => set({ stock: e.target.value as StockFilter })}
        >
          <option value="all">Усі</option>
          <option value="in">В наявності</option>
          <option value="out">Немає в наявності</option>
        </select>
      </div>
      <div>
        {!isAdminFilterEmpty(filter) && (
          <button type="button" className="btn" onClick={() => onChange(EMPTY_ADMIN_FILTER)}>
            Скинути
          </button>
        )}
      </div>
    </div>
  );
}
