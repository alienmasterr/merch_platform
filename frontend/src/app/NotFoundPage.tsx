import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="card stack">
      <h1>Сторінку не знайдено</h1>
      <p className="muted">Такої адреси немає. Можливо, посилання застаріло.</p>
      <p>
        <Link to="/catalog">До каталогу</Link>
      </p>
    </div>
  );
}
