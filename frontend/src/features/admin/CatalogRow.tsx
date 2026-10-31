import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { updateCatalogItem } from '../../api/admin';
import { describeError } from '../../api/errors';
import type { ApparelItem } from '../../api/types';
import { colorLabel, formatMoney } from '../../shared/format';
import { catalogKeys } from '../catalog/useCatalog';
import { parsePrice } from './itemForm';

export function CatalogRow({ item }: { item: ApparelItem }) {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(String(item.basePrice));
  const [saved, setSaved] = useState(false);
  const [stockDraft, setStockDraft] = useState<boolean | null>(null);

  const update = useMutation({
    mutationFn: (patch: { basePrice?: number; inStock?: boolean }) =>
      updateCatalogItem(item.id, patch),
    onSuccess: (updated) => {
      setPrice(String(updated.basePrice));
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
    },
    onError: () => setStockDraft(null),
  });

  const inStock = stockDraft ?? item.inStock;
  const newPrice = parsePrice(price);
  const priceChanged = newPrice !== null && newPrice !== item.basePrice;

  return (
    <tr>
      <td>
        <Link to={`/product/${item.id}`}>{item.title}</Link>
        <div className="small muted">
          <code>{item.id}</code>
        </div>
      </td>
      <td>{item.category.name}</td>
      <td>
        {colorLabel(item.color)}, {item.size}
      </td>
      <td>
        <form
          className="row price-edit"
          onSubmit={(e) => {
            e.preventDefault();
            if (priceChanged) update.mutate({ basePrice: newPrice });
          }}
        >
          <input
            aria-label={`Ціна ${item.id}`}
            inputMode="decimal"
            value={price}
            aria-invalid={newPrice === null}
            onChange={(e) => {
              setPrice(e.target.value);
              setSaved(false);
            }}
          />
          <button
            type="submit"
            className="btn btn--small"
            disabled={!priceChanged || update.isPending}
          >
            Зберегти
          </button>
        </form>
        <span className="small muted">зараз {formatMoney(item.basePrice)}</span>
      </td>
      <td>
        <label className="row small">
          <input
            type="checkbox"
            checked={inStock}
            disabled={update.isPending}
            aria-label={`В наявності ${item.id}`}
            onChange={(e) => {
              setStockDraft(e.target.checked);
              update.mutate({ inStock: e.target.checked });
            }}
          />
          {inStock ? 'Так' : 'Ні'}
        </label>
      </td>
      <td className="small" aria-live="polite">
        {update.isPending && <span className="spinner" aria-label="Збереження" />}
        {update.isError && <span className="field-error">{describeError(update.error)}</span>}
        {saved && !update.isPending && !update.isError && (
          <span className="badge badge--success">Збережено</span>
        )}
      </td>
    </tr>
  );
}
