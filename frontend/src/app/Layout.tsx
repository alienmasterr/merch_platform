import { Link, NavLink, Outlet } from 'react-router';
import { CartLink } from '../features/cart/CartLink';
import { HealthIndicator } from './HealthIndicator';
import { RoleSwitcher } from './RoleSwitcher';

export function Layout() {
  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/catalog" className="brand">
            Merch Platform
          </Link>
          <nav className="nav" aria-label="Головне меню">
            <NavLink to="/catalog">Каталог</NavLink>
            <NavLink to="/customizer">Конструктор</NavLink>
            <CartLink />
            <NavLink to="/manager">Менеджер</NavLink>
            <NavLink to="/admin">Адмін</NavLink>
          </nav>
          <div className="header-tools">
            <RoleSwitcher />
            <HealthIndicator />
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}
