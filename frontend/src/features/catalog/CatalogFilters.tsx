import { useEffect, useRef, useState } from 'react';
import type { CatalogFilter, Category } from '../../api/types';
import { colorLabel, colorSwatch } from '../../shared/format';
import { useDebouncedValue } from '../../shared/useDebouncedValue';
import { isFilterEmpty, type FilterOptions } from './filters';

interface Props {
  filter: CatalogFilter;
  categories: Category[];
  options: FilterOptions;
  onChange: (filter: CatalogFilter) => void;
}

function toPrice(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function CatalogFilters({ filter, categories, options, onChange }: Props) {
  // ціни застосовуємо з затримкою, щоб не робити запит на кожну цифру
  const [minPrice, setMinPrice] = useState(filter.minPrice?.toString() ?? '');
  const [maxPrice, setMaxPrice] = useState(filter.maxPrice?.toString() ?? '');
  const debouncedMin = useDebouncedValue(minPrice);
  const debouncedMax = useDebouncedValue(maxPrice);

  // актуальні filter/onChange для ефекту нижче, який має реагувати лише на зміну введених цін
  const latest = useRef({ filter, onChange });
  useEffect(() => {
    latest.current = { filter, onChange };
  });

  useEffect(() => {
    const { filter: current, onChange: emit } = latest.current;
    const min = toPrice(debouncedMin);
    const max = toPrice(debouncedMax);
    if (min !== current.minPrice || max !== current.maxPrice) {
      emit({ ...current, minPrice: min, maxPrice: max });
    }
  }, [debouncedMin, debouncedMax]);

  const set = (patch: Partial<CatalogFilter>) => onChange({ ...filter, ...patch });

  const reset = () => {
    setMinPrice('');
    setMaxPrice('');
    onChange({});
  };

  return (
    <aside className="card stack catalog-filters" aria-label="Фільтри">
      <div className="row">
        <h2 className="spacer">Фільтри</h2>
        {!isFilterEmpty(filter) && (
          <button type="button" className="btn btn--small" onClick={reset}>
            Скинути
          </button>
        )}
      </div>

      <label className="field">
        Категорія
        <select
          value={filter.categoryId ?? ''}
          onChange={(e) => set({ categoryId: e.target.value || undefined })}
        >
          <option value="">Усі</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="chip-group">
        <legend>Розмір</legend>
        {options.sizes.map((size) => (
          <button
            key={size}
            type="button"
            className="chip"
            aria-pressed={filter.size?.toLowerCase() === size.toLowerCase()}
            onClick={() =>
              set({ size: filter.size?.toLowerCase() === size.toLowerCase() ? undefined : size })
            }
          >
            {size}
          </button>
        ))}
      </fieldset>

      <fieldset className="chip-group">
        <legend>Колір</legend>
        {options.colors.map((color) => (
          <button
            key={color}
            type="button"
            className="chip"
            aria-pressed={filter.color?.toLowerCase() === color}
            onClick={() =>
              set({ color: filter.color?.toLowerCase() === color ? undefined : color })
            }
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

      <div className="row price-range">
        <label className="field">
          Ціна від
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </label>
        <label className="field">
          до
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </label>
      </div>

      <label className="row small">
        <input
          type="checkbox"
          checked={filter.inStockOnly ?? false}
          onChange={(e) => set({ inStockOnly: e.target.checked || undefined })}
        />
        Лише в наявності
      </label>
    </aside>
  );
}
