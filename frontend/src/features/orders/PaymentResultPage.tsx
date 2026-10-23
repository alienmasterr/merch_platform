import { useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { simulateSuccessfulPayment } from '../../api/devPayment';
import type { Order } from '../../api/types';
import { formatMoney } from '../../shared/format';
import { ErrorMessage, Loading } from '../../shared/QueryState';
import { useOrder } from './useOrder';

/**
 * Сюди LiqPay (або dev-заглушка) повертає покупця після оплати. Факт оплати підтверджує
 * лише webhook на бекенді, тож тут опитуємо статус, доки замовлення не вийде з CREATED.
 */
export function PaymentResultPage() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId') ?? undefined;
  const order = useOrder(orderId, 2000);

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
          {/* у production-збірці цей блок і код підпису вирізаються */}
          {import.meta.env.DEV && <DevPaymentPanel order={o} />}
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

/** Лише в режимі розробки: бекенд без ключів LiqPay чекає підписаний callback, його й імітуємо. */
function DevPaymentPanel({ order }: { order: Order }) {
  const pay = useMutation({ mutationFn: () => simulateSuccessfulPayment(order.id, order.total) });
  return (
    <div className="alert alert--warning stack">
      <strong>Режим розробки</strong>
      <span className="small">
        LiqPay не підключено (бекенд працює із заглушкою). Натисніть, щоб надіслати бекенду
        підписаний callback «оплата успішна», як це зробив би LiqPay.
      </span>
      <div>
        <button
          type="button"
          className="btn btn--small"
          disabled={pay.isPending || pay.isSuccess}
          onClick={() => pay.mutate()}
        >
          {pay.isSuccess ? 'Callback надіслано' : 'Імітувати успішну оплату'}
        </button>
      </div>
      {pay.isError && <ErrorMessage error={pay.error} />}
    </div>
  );
}
