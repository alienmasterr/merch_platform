import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { createCatalogItem } from '../../api/admin';
import type { ApparelItem, Category } from '../../api/types';
import { KIND_LABELS } from '../../shared/labels';
import { ErrorMessage } from '../../shared/QueryState';
import { catalogKeys } from '../catalog/useCatalog';
import { categoriesForKind } from './catalogFilter';
import {
  buildCreateRequest,
  EMPTY_ITEM_FORM,
  type ItemForm,
  type ItemFormErrors,
} from './itemForm';

interface Props {
  categories: Category[];
  items: ApparelItem[];
  onCreated: (item: ApparelItem) => void;
  onCancel: () => void;
}

export function CreateItemForm({ categories, items, onCreated, onCancel }: Props) {
  const queryClient = useQueryClient();
  const allowedFor = (kind: ItemForm['kind']) => categoriesForKind(kind, categories, items);
  const defaultCategory = (kind: ItemForm['kind']) => {
    const allowed = allowedFor(kind);
    return allowed.length === 1 ? (allowed[0]?.id ?? '') : '';
  };
  const [form, setForm] = useState<ItemForm>(() => ({
    ...EMPTY_ITEM_FORM,
    categoryId: defaultCategory(EMPTY_ITEM_FORM.kind),
  }));
  const [errors, setErrors] = useState<ItemFormErrors>({});
  const allowedCategories = allowedFor(form.kind);

  const create = useMutation({
    mutationFn: createCatalogItem,
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      onCreated(item);
    },
  });

  const set = <K extends keyof ItemForm>(key: K, value: ItemForm[K]) =>
    setForm({ ...form, [key]: value });

  const changeKind = (kind: ItemForm['kind']) => {
    const stillAllowed = allowedFor(kind).some((c) => c.id === form.categoryId);
    setForm({ ...form, kind, categoryId: stillAllowed ? form.categoryId : defaultCategory(kind) });
    setErrors({});
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = buildCreateRequest(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    create.mutate(result.request);
  };

  const text = (
    key: keyof ItemForm,
    label: string,
    props: { type?: string; inputMode?: 'decimal' | 'numeric' } = {},
  ) => (
    <Field label={label} error={errors[key]} htmlFor={`item-${key}`}>
      <input
        id={`item-${key}`}
        type={props.type ?? 'text'}
        inputMode={props.inputMode}
        value={String(form[key])}
        aria-invalid={!!errors[key]}
        onChange={(e) => set(key, e.target.value as never)}
      />
    </Field>
  );

  return (
    <form className="card stack" onSubmit={onSubmit} noValidate aria-label="Новий товар">
      <h2>Новий товар</h2>
      <div className="form-grid">
        <Field label="Тип" htmlFor="item-kind">
          <select
            id="item-kind"
            value={form.kind}
            onChange={(e) => changeKind(e.target.value as ItemForm['kind'])}
          >
            {(Object.keys(KIND_LABELS) as ItemForm['kind'][]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Категорія" error={errors.categoryId} htmlFor="item-categoryId">
          <select
            id="item-categoryId"
            value={form.categoryId}
            aria-invalid={!!errors.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
          >
            <option value="">—</option>
            {allowedCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {text('title', 'Назва')}
        {text('basePrice', 'Ціна, грн', { inputMode: 'decimal' })}
        {text('size', 'Розмір')}
        {text('color', 'Колір (англ., напр. black)')}
        {text('fabricComposition', 'Склад')}

        {form.kind === 'BOTTOM' && (
          <>
            {text('waistCm', 'Талія, см', { inputMode: 'numeric' })}
            {text('lengthCm', 'Довжина, см', { inputMode: 'numeric' })}
          </>
        )}
        {form.kind === 'ACCESSORY' && text('accessoryType', 'Тип аксесуара (mug, tote-bag…)')}
      </div>

      <div className="row">
        {form.kind === 'TOP' && (
          <>
            <label className="row small">
              <input
                type="checkbox"
                checked={form.hasHood}
                onChange={(e) => set('hasHood', e.target.checked)}
              />
              Капюшон
            </label>
            <label className="row small">
              <input
                type="checkbox"
                checked={form.hasPockets}
                onChange={(e) => set('hasPockets', e.target.checked)}
              />
              Кишені
            </label>
          </>
        )}
        <label className="row small">
          <input
            type="checkbox"
            checked={form.inStock}
            onChange={(e) => set('inStock', e.target.checked)}
          />
          В наявності
        </label>
      </div>

      {create.isError && <ErrorMessage error={create.error} />}
      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={create.isPending}>
          {create.isPending ? 'Зберігаємо…' : 'Зберегти товар'}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Скасувати
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
