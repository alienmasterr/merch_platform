import { useQuery } from '@tanstack/react-query';
import { getHealth } from '../api/catalog';

/** Індикатор доступності бекенду: опитує /health кожні 10 с. */
export function HealthIndicator() {
  const { isSuccess, isError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 10_000,
    retry: false,
  });
  const state = isSuccess ? 'ok' : isError ? 'down' : 'unknown';
  const label = { ok: 'API працює', down: 'API недоступний', unknown: 'API…' }[state];
  return (
    <span className="small" title={label} data-testid="health" data-state={state}>
      <span className={`status-dot status-dot--${state}`} aria-hidden="true" />
      {label}
    </span>
  );
}
