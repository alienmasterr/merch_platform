import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setRole } from '../api/session';
import { customProducts, orders, server } from './server';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  customProducts.clear();
  orders.clear();
  localStorage.clear();
  setRole('customer');
});
afterAll(() => server.close());
