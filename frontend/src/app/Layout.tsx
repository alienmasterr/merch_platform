import { Link, NavLink, Outlet } from 'react-router';
import { CartLink } from '../features/cart/CartLink';
import { RoleSwitcher } from './RoleSwitcher';
import { useRole } from './useRole';

export function Layout() {
  const role = useRole();
  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/catalog" className="brand">
            Merch Platform
          </Link>
          <nav className="nav" aria-label="Головне меню">
            <NavLink to="/catalog">Каталог</NavLink>
            <CartLink />
            {/* службові розділи видно лише відповідній ролі */}
            {role === 'manager' && <NavLink to="/manager">Менеджер</NavLink>}
            {role === 'admin' && <NavLink to="/admin">Адмін</NavLink>}
          </nav>
          <div className="header-tools">
            <RoleSwitcher />
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}
