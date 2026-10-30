import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { formatMoney } from '../../shared/format';
import { ErrorMessage, Loading } from '../../shared/QueryState';
import { useOrder } from './useOrder';

/** Після цього часу без підтвердження підказуємо, що робити далі. */
const SLOW_PAYMENT_MS = 30_000;

/**
 * Сюди LiqPay повертає покупця після оплати. Факт оплати підтверджує лише webhook на бекенді
 * (зазвичай за кілька секунд), тож опитуємо статус щосекунди, доки замовлення не вийде з CREATED.
 */
export function PaymentResultPage() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId') ?? undefined;
  const order = useOrder(orderId, 1000);
  const slow = useElapsed(SLOW_PAYMENT_MS);

  if (!orderId) {
    return (
      <div className="card stack">
        <h1>Результат оплати</h1>
        <p className="muted">Не вказано номер замовлення.</p>
        <Link to="/catalog">До каталогу</Link>
      </div>
    );
  }
  if (order.isPending) return <Loading />;
  if (order.isError)
    return <ErrorMessage error={order.error} onRetry={() => void order.refetch()} />;

  const o = order.data;
  return (
    <div className="card stack payment-result">
      <h1>Результат оплати</h1>
      {o.status === 'CREATED' && (
        <>
          <p className="row" role="status">
            <span className="spinner" aria-hidden="true" /> Очікуємо підтвердження оплати від
            LiqPay…
          </p>
          <p className="small muted">Сторінка оновиться сама. Зазвичай це займає кілька секунд.</p>
          {slow && (
            <p className="alert alert--warning small">
              Підтвердження ще не надійшло. Якщо ви не завершили оплату, поверніться до замовлення й
              оплатіть його ще раз.
            </p>
          )}
        </>
      )}
      {o.status === 'CANCELLED' && <p className="alert alert--error">Замовлення скасовано.</p>}
      {o.status !== 'CREATED' && o.status !== 'CANCELLED' && (
        <p className="alert alert--success" role="status">
          Оплату {formatMoney(o.total)} отримано. Чек надіслано на {o.recipient.email}.
        </p>
      )}
      <Link to={`/orders/${o.id}`} className="btn">
        Перейти до замовлення
      </Link>
    </div>
  );
}

/** true, коли з моменту відкриття сторінки минуло `ms`. */
function useElapsed(ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return elapsed;
}
