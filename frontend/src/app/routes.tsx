import { Navigate, type RouteObject } from 'react-router';
import { AdminPage } from '../features/admin/AdminPage';
import { CartPage } from '../features/cart/CartPage';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { ProductPage } from '../features/catalog/ProductPage';
import { CheckoutPage } from '../features/checkout/CheckoutPage';
import { CustomizerPage } from '../features/customizer/CustomizerPage';
import { ManagerPage } from '../features/manager/ManagerPage';
import { OrderPage } from '../features/orders/OrderPage';
import { PaymentResultPage } from '../features/orders/PaymentResultPage';
import { Layout } from './Layout';
import { NotFoundPage } from './NotFoundPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/catalog" replace /> },
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'product/:id', element: <ProductPage /> },
      { path: 'customizer', element: <CustomizerPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'orders/:id', element: <OrderPage /> },
      { path: 'payment-result', element: <PaymentResultPage /> },
      { path: 'manager', element: <ManagerPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
