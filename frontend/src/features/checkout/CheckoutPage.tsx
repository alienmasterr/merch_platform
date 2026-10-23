import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { createOrder, getShippingCost } from '../../api/orders';
import type { RecipientDetails } from '../../api/types';
import { formatMoney } from '../../shared/format';
import { ErrorMessage } from '../../shared/QueryState';
import { useDebouncedValue } from '../../shared/useDebouncedValue';
import { useCart } from '../cart/cartContext';
import { cartTotal, countItems } from '../cart/cartStore';
import { useCustomProducts } from '../customizer/useCustomProducts';
import { orderKey } from '../orders/orderKeys';
import {
  cleanRecipient,
  loadSavedRecipient,
  parcelWeightKg,
  saveRecipient,
  validateRecipient,
  type RecipientErrors,
} from './recipient';

const FIELDS: {
  name: keyof RecipientDetails;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
}[] = [
  { name: 'fullName', label: 'Прізвище та імʼя', autoComplete: 'name' },
  {
    name: 'phone',
    label: 'Телефон',
    type: 'tel',
    autoComplete: 'tel',
    hint: 'Наприклад 050 123 45 67',
  },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', hint: 'Сюди надійде чек' },
  { name: 'city', label: 'Місто', autoComplete: 'address-level2' },
  { name: 'warehouse', label: 'Відділення Нової Пошти №', hint: 'Номер відділення, наприклад 12' },
];

export function CheckoutPage() {
  const { lines, dispatch } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const products = useCustomProducts(lines.map((l) => l.customProductId));

  const [recipient, setRecipient] = useState<RecipientDetails>(loadSavedRecipient);
  const [touched, setTouched] = useState<Partial<Record<keyof RecipientDetails, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const errors: RecipientErrors = validateRecipient(recipient);

  const itemCount = countItems(lines);
  const city = useDebouncedValue(recipient.city.trim(), 500);
  const weightKg = parcelWeightKg(itemCount);
  const shipping = useQuery({
    queryKey: ['shipping', city, weightKg],
    queryFn: () => getShippingCost(city, weightKg),
    enabled: city.length > 0,
    staleTime: 5 * 60_000,
  });

  const order = useMutation({
    mutationFn: () =>
      createOrder({
        items: lines.map((l) => ({ customProductId: l.customProductId, quantity: l.quantity })),
        recipient: cleanRecipient(recipient),
      }),
    onSuccess: (created) => {
      saveRecipient(cleanRecipient(recipient));
      queryClient.setQueryData(orderKey(created.id), created);
      void navigate(`/orders/${created.id}`);
      dispatch({ type: 'clear' });
    },
  });

  if (lines.length === 0) {
    return (
      <div className="card stack">
        <h1>Оформлення замовлення</h1>
        <p className="muted">Кошик порожній.</p>
        <Link to="/catalog">До каталогу</Link>
      </div>
    );
  }

  const prices = Object.fromEntries(
    lines.map((l) => [l.customProductId, products.byId[l.customProductId]?.totalCost]),
  );
  const itemsTotal = cartTotal(lines, prices);
  const shippingCost = shipping.data?.cost;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length === 0) order.mutate();
  };

  const showError = (name: keyof RecipientDetails) =>
    submitted || touched[name] ? errors[name] : undefined;

  return (
    <div className="stack">
      <h1>Оформлення замовлення</h1>
      <form className="cart-layout" onSubmit={onSubmit} noValidate>
        <div className="card stack">
          <h2>Отримувач</h2>
          {FIELDS.map((f) => {
            const error = showError(f.name);
            const id = `recipient-${f.name}`;
            return (
              <div key={f.name} className="field">
                <label htmlFor={id}>{f.label}</label>
                <input
                  id={id}
                  name={f.name}
                  type={f.type ?? 'text'}
                  inputMode={f.name === 'warehouse' ? 'numeric' : undefined}
                  autoComplete={f.autoComplete}
                  value={recipient[f.name]}
                  aria-invalid={!!error}
                  aria-describedby={error ? `${id}-error` : undefined}
                  onChange={(e) => setRecipient({ ...recipient, [f.name]: e.target.value })}
                  onBlur={() => setTouched({ ...touched, [f.name]: true })}
                />
                {error ? (
                  <span id={`${id}-error`} className="field-error">
                    {error}
                  </span>
                ) : (
                  f.hint && <span className="small muted">{f.hint}</span>
                )}
              </div>
            );
          })}
        </div>

        <aside className="card stack cart-summary">
          <h2>Ваше замовлення</h2>
          <div className="row">
            <span className="spacer">Товари ({itemCount})</span>
            <span className="price">{products.isPending ? '…' : formatMoney(itemsTotal)}</span>
          </div>
          <div className="row">
            <span className="spacer">Доставка ({weightKg} кг)</span>
            <span className="price" data-testid="shipping-cost">
              {!city
                ? 'вкажіть місто'
                : shipping.isFetching
                  ? '…'
                  : shippingCost !== undefined
                    ? formatMoney(shippingCost)
                    : '—'}
            </span>
          </div>
          {shipping.isError && <ErrorMessage error={shipping.error} />}
          <div className="row">
            <strong className="spacer">До сплати</strong>
            <span className="price" data-testid="checkout-total">
              {shippingCost !== undefined && !products.isPending
                ? formatMoney(itemsTotal + shippingCost)
                : '—'}
            </span>
          </div>
          <p className="small muted">
            Остаточну суму зафіксує сервер під час створення замовлення.
          </p>
          {order.isError && <ErrorMessage error={order.error} />}
          <button type="submit" className="btn btn--primary" disabled={order.isPending}>
            {order.isPending ? 'Створюємо замовлення…' : 'Підтвердити замовлення'}
          </button>
          <Link to="/cart" className="small">
            Повернутися до кошика
          </Link>
        </aside>
      </form>
    </div>
  );
}
