import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { retryNotifications } from '../../api/manager';
import type { OrderActionResult } from '../../api/types';
import { STATUS_LABELS } from '../../shared/labels';
import { ErrorMessage } from '../../shared/QueryState';
import { orderKey } from '../orders/orderKeys';

interface Props {
  result: OrderActionResult;
  onUpdate: (result: OrderActionResult) => void;
  onDismiss: () => void;
}

/**
 * Результат дії менеджера. Живе на рівні сторінки, бо після зміни статусу замовлення
 * зникає з поточної вкладки, а попередження (ТТН, email) і «Повторити» мають лишитися видимими.
 */
export function ActionNotice({ result, onUpdate, onDismiss }: Props) {
  const queryClient = useQueryClient();
  const retry = useMutation({
    mutationFn: () => retryNotifications(result.id),
    onSuccess: (r) => {
      queryClient.setQueryData(orderKey(r.id), r);
      onUpdate(r);
    },
  });
  const ok = result.warnings.length === 0;

  return (
    <div
      className={`alert ${ok ? 'alert--success' : 'alert--warning'} stack small`}
      role={ok ? 'status' : 'alert'}
    >
      <div className="row">
        <span className="spacer">
          Замовлення <Link to={`/orders/${result.id}`}>{result.id}</Link>: статус «
          {STATUS_LABELS[result.status]}»{result.ttnNumber && <>, ТТН {result.ttnNumber}</>}.
        </span>
        <button type="button" className="btn btn--small" aria-label="Закрити" onClick={onDismiss}>
          ×
        </button>
      </div>
      {!ok && (
        <>
          <span>Статус змінено, але не все спрацювало:</span>
          <ul>
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <div>
            <button
              type="button"
              className="btn btn--small"
              disabled={retry.isPending}
              onClick={() => retry.mutate()}
            >
              Повторити сповіщення
            </button>
          </div>
        </>
      )}
      {retry.isError && <ErrorMessage error={retry.error} />}
    </div>
  );
}
