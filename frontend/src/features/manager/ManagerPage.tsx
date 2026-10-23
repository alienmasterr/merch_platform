import type { OrderStatus } from '@merch/contracts';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { listOrdersByStatus } from '../../api/manager';
import type { OrderActionResult } from '../../api/types';
import { useRole } from '../../app/useRole';
import { STATUS_LABELS } from '../../shared/labels';
import { ErrorMessage, Loading } from '../../shared/QueryState';
import { ActionNotice } from './ActionNotice';
import { managerOrdersKey, ORDER_STATUSES } from './managerActions';
import { ManagerOrderCard } from './ManagerOrderCard';

export function ManagerPage() {
  const role = useRole();
  const [params, setParams] = useSearchParams();
  const raw = params.get('status');
  const status: OrderStatus = ORDER_STATUSES.includes(raw as OrderStatus)
    ? (raw as OrderStatus)
    : 'PENDING_REVIEW';

  const [results, setResults] = useState<OrderActionResult[]>([]);
  const pushResult = (r: OrderActionResult) =>
    setResults((prev) => [r, ...prev.filter((x) => x.id !== r.id)].slice(0, 5));

  // запит іде завжди: роль перевіряє бекенд, без ролі менеджера він поверне 403
  const orders = useQuery({
    queryKey: [...managerOrdersKey(status), role],
    queryFn: () => listOrdersByStatus(status),
    refetchInterval: 10_000,
  });

  return (
    <div className="stack">
      <h1>Панель менеджера</h1>
      {role !== 'manager' && (
        <p className="alert alert--warning">
          Оберіть роль «Менеджер» у шапці, щоб працювати із замовленнями.
        </p>
      )}

      <div className="tabs" role="tablist" aria-label="Статус замовлень">
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            className="tab"
            aria-selected={s === status}
            onClick={() =>
              setParams(s === 'PENDING_REVIEW' ? {} : { status: s }, { replace: true })
            }
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {results.map((r) => (
        <ActionNotice
          key={r.id}
          result={r}
          onUpdate={pushResult}
          onDismiss={() => setResults((prev) => prev.filter((x) => x.id !== r.id))}
        />
      ))}

      {orders.isPending && <Loading />}
      {orders.isError && (
        <ErrorMessage error={orders.error} onRetry={() => void orders.refetch()} />
      )}
      {orders.isSuccess && orders.data.length === 0 && (
        <p className="card muted">Замовлень зі статусом «{STATUS_LABELS[status]}» немає.</p>
      )}
      {orders.data?.map((order) => (
        <ManagerOrderCard key={order.id} order={order} onResult={pushResult} />
      ))}
    </div>
  );
}
