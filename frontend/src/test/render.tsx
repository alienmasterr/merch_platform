import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '../app/providers';
import { routes } from '../app/routes';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup({ applyAccept: false });
  const utils = render(
    <AppProviders queryClient={createTestQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...utils, router, user };
}
