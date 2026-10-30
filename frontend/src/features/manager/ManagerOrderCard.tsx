import type { OrderStatus } from '@merch/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { changeOrderStatus, verifyMockup } from '../../api/manager';
import type { Order, OrderActionResult } from '../../api/types';
import { formatDateTime, formatMoney } from '../../shared/format';
import { PLACEMENT_LABELS, STATUS_LABELS, TECHNOLOGY_LABELS } from '../../shared/labels';
import { ErrorMessage } from '../../shared/QueryState';
import { ProductViews } from '../customizer/ProductViews';
import { useCustomProducts } from '../customizer/useCustomProducts';
import { orderKey } from '../orders/orderKeys';
import { cancelRefunds, canReviewMockup, manualTransitions } from './managerActions';

type Action = { kind: 'approve' } | { kind: 'reject' } | { kind: 'status'; status: OrderStatus };

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  SHIPPED: 'Передати в Нову Пошту',
  CANCELLED: 'Скасувати замовлення',
};

interface Props {
  order: Order;
  /** Результат дії показує сторінка (картка може зникнути з вкладки після зміни статусу). */
  onResult: (result: OrderActionResult) => void;
}

export function ManagerOrderCard({ order, onResult }: Props) {
  const queryClient = useQueryClient();
  const products = useCustomProducts(order.items.map((i) => i.customProductId));
  const [confirming, setConfirming] = useState<'reject' | 'cancel' | null>(null);

  const action = useMutation({
    mutationFn: (a: Action) => {
      switch (a.kind) {
        case 'approve':
          return verifyMockup(order.id, true);
        case 'reject':
          return verifyMockup(order.id, false);
        case 'status':
          return changeOrderStatus(order.id, a.status);
      }
    },
    onSuccess: (r) => {
      onResult(r);
      setConfirming(null);
      queryClient.setQueryData(orderKey(r.id), r);
      void queryClient.invalidateQueries({ queryKey: ['manager', 'orders'] });
    },
  });

  const run = (a: Action) => action.mutate(a);

  return (
    <article className="card stack" aria-label={`Замовлення ${order.id}`}>
      <div className="row">
        <Link to={`/orders/${order.id}`} className="spacer">
          <code>{order.id}</code>
        </Link>
        <span className="badge badge--accent">{STATUS_LABELS[order.status]}</span>
      </div>
      <p className="small muted">
        {formatDateTime(order.createdAt)} · {order.recipient.fullName}, {order.recipient.phone} ·{' '}
        {order.recipient.city}, відділення №{order.recipient.warehouse} ·{' '}
        <span className="price">{formatMoney(order.total)}</span>
        {order.ttnNumber && <> · ТТН {order.ttnNumber}</>}
      </p>

      <div className="mockup-grid">
        {order.items.map((item) => {
          const product = products.byId[item.customProductId];
          return (
            <figure key={item.customProductId} className="mockup-review">
              {product ? <ProductViews product={product} /> : <div className="mockup" />}
              <figcaption className="small stack">
                <strong>
                  {product?.baseItem.title ?? 'Виріб'} × {item.quantity}
                </strong>
                {product?.prints.map((p) => (
                  <span key={p.placement}>
                    {PLACEMENT_LABELS[p.placement]}: {TECHNOLOGY_LABELS[p.technology]},{' '}
                    {Math.round(p.widthMm * p.scale)}×{Math.round(p.heightMm * p.scale)} мм ·{' '}
                    <a href={p.printFileUrl} target="_blank" rel="noreferrer">
                      оригінал
                    </a>
                  </span>
                ))}
              </figcaption>
            </figure>
          );
        })}
      </div>

      <div className="row">
        {canReviewMockup(order) && confirming !== 'reject' && (
          <>
            <button
              type="button"
              className="btn btn--primary"
              disabled={action.isPending}
              onClick={() => run({ kind: 'approve' })}
            >
              Схвалити макет
            </button>
            <button
              type="button"
              className="btn btn--danger"
              disabled={action.isPending}
              onClick={() => setConfirming('reject')}
            >
              Відхилити
            </button>
          </>
        )}
        {confirming === 'reject' && (
          <ConfirmBar
            text="Відхилити макет? Кошти буде повернуто, замовлення скасовано."
            confirmLabel="Так, відхилити"
            pending={action.isPending}
            onConfirm={() => run({ kind: 'reject' })}
            onCancel={() => setConfirming(null)}
          />
        )}

        {manualTransitions(order)
          .filter((s) => !(s === 'CANCELLED' && canReviewMockup(order)))
          .map((s) =>
            s === 'CANCELLED' && confirming === 'cancel' ? (
              <ConfirmBar
                key={s}
                text={
                  cancelRefunds(order)
                    ? 'Скасувати? Оплачені кошти буде повернуто.'
                    : 'Скасувати замовлення?'
                }
                confirmLabel="Так, скасувати"
                pending={action.isPending}
                onConfirm={() => run({ kind: 'status', status: 'CANCELLED' })}
                onCancel={() => setConfirming(null)}
              />
            ) : (
              <button
                key={s}
                type="button"
                className={s === 'CANCELLED' ? 'btn btn--danger' : 'btn btn--primary'}
                disabled={action.isPending}
                onClick={() =>
                  s === 'CANCELLED' ? setConfirming('cancel') : run({ kind: 'status', status: s })
                }
              >
                {ACTION_LABELS[s] ?? STATUS_LABELS[s]}
              </button>
            ),
          )}
      </div>

      {action.isError && <ErrorMessage error={action.error} />}
    </article>
  );
}

interface ConfirmProps {
  text: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmBar({ text, confirmLabel, pending, onConfirm, onCancel }: ConfirmProps) {
  return (
    <div className="alert alert--warning row">
      <span className="spacer">{text}</span>
      <button
        type="button"
        className="btn btn--small btn--danger"
        disabled={pending}
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
      <button type="button" className="btn btn--small" onClick={onCancel}>
        Ні
      </button>
    </div>
  );
}
