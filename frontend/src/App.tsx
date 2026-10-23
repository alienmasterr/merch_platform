import { useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppProviders } from './app/providers';
import { createQueryClient } from './app/queryClient';
import { routes } from './app/routes';

const router = createBrowserRouter(routes);

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
