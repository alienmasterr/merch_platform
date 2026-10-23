import { Link } from 'react-router';
import { loadRecentOrders } from './recentOrdersStore';

/** Посилання на останні замовлення з цього браузера (акаунтів у системі немає). */
export function RecentOrders() {
  const ids = loadRecentOrders();
  if (ids.length === 0) return null;
  return (
    <section className="card stack" aria-label="Ваші замовлення">
      <h2>Ваші замовлення</h2>
      <ul className="small recent-orders">
        {ids.map((id) => (
          <li key={id}>
            <Link to={`/orders/${id}`}>{id}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
