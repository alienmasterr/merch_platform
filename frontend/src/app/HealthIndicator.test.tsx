import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/render';
import { apiUrl, server } from '../test/server';

describe('HealthIndicator', () => {
  it('is green when the backend answers', async () => {
    renderApp('/catalog');
    await waitFor(() => expect(screen.getByTestId('health')).toHaveAttribute('data-state', 'ok'));
  });

  it('is red when the backend is down', async () => {
    server.use(http.get(apiUrl('/health'), () => HttpResponse.error()));
    renderApp('/catalog');
    await waitFor(() => expect(screen.getByTestId('health')).toHaveAttribute('data-state', 'down'));
    expect(screen.getByText('API недоступний')).toBeInTheDocument();
  });
});
