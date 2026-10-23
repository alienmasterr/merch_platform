import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../../api/errors';
import { checkoutOrder } from '../../api/orders';
import { formatDateTime, formatMoney } from '../../shared/format';
import { browser } from '../../shared/navigation';
import { ErrorMessage, Loading } from '../../shared/QueryState';
import { OrderItems } from './OrderItems';
import { rememberOrder } from './recentOrdersStore';
import { isFinalStatus, trackingUrl } from './status';
import { StatusTimeline } from './StatusTimeline';
import { useOrder } from './useOrder';

export function OrderPage() {
  const { id } = useParams();
  const order = useOrder(id);

  const pay = useMutation({
    mutationFn: () => checkoutOrder(id ?? ''),
    // LiqPay (або dev-заглушка) повертає адресу платіжної сторінки
    onSuccess: (invoice) => browser.redirect(invoice.checkoutUrl),
  });

  useEffect(() => {
    if (order.data) rememberOrder(order.data.id);
  }, [order.data]);

  if (order.isPending) return <Loading />;
  if (order.isError) {
    if (order.error instanceof ApiError && order.error.status === 404) {
      return (
        <div className="card stack">
          <h1>Замовлення не знайдено</h1>
          <Link to="/catalog">До каталогу</Link>
        </div>
      );
    }
    return <ErrorMessage error={order.error} onRetry={() => void order.refetch()} />;
  }

  const o = order.data;
  const itemsTotal = Math.round((o.total - o.shippingCost) * 100) / 100;

  return (
    <div className="stack">
      <div className="row">
        <h1 className="spacer">Замовлення</h1>
        {!isFinalStatus(o.status) && (
          <span className="small muted row" title="Статус оновлюється автоматично">
            <span className="spinner" aria-hidden="true" /> оновлюється автоматично
          </span>
        )}
      </div>
      <p className="small muted">
        № <code>{o.id}</code> від {formatDateTime(o.createdAt)}. Збережіть це посилання, щоб стежити
        за замовленням.
      </p>

      <div className="card">
        <StatusTimeline status={o.status} />
      </div>

      {o.status === 'CREATED' && (
        <div className="card row">
          <span className="spacer">
            До сплати <span className="price">{formatMoney(o.total)}</span>
          </span>
          <button
            type="button"
            className="btn btn--primary"
            disabled={pay.isPending}
            onClick={() => pay.mutate()}
          >
            {pay.isPending ? 'Переходимо до оплати…' : 'Оплатити через LiqPay'}
          </button>
          {pay.isError && <ErrorMessage error={pay.error} />}
        </div>
      )}

      {o.ttnNumber && (
        <div className="card row">
          <span className="spacer">
            ТТН Нової Пошти: <strong data-testid="ttn">{o.ttnNumber}</strong>
          </span>
          <a
            href={trackingUrl(o.ttnNumber)}
            target="_blank"
            rel="noreferrer"
            className="btn btn--small"
          >
            Відстежити
          </a>
        </div>
      )}

      <div className="cart-layout">
        <div className="card stack">
          <h2>Позиції</h2>
          <OrderItems order={o} />
        </div>
        <aside className="card stack">
          <h2>Доставка</h2>
          <p>
            {o.recipient.fullName}
            <br />
            <span className="small muted">
              {o.recipient.phone}, {o.recipient.email}
            </span>
            <br />
            {o.recipient.city}, відділення №{o.recipient.warehouse}
          </p>
          <div className="row">
            <span className="spacer">Товари</span>
            <span className="price">{formatMoney(itemsTotal)}</span>
          </div>
          <div className="row">
            <span className="spacer">Доставка</span>
            <span className="price">{formatMoney(o.shippingCost)}</span>
          </div>
          <div className="row">
            <strong className="spacer">Разом</strong>
            <span className="price" data-testid="order-total">
              {formatMoney(o.total)}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
