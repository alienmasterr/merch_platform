import { describeError } from '../api/errors';

export function Loading({ label = 'Завантаження…' }: { label?: string }) {
  return (
    <div className="row muted" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="alert alert--error row" role="alert">
      <span>{describeError(error)}</span>
      {onRetry && (
        <button type="button" className="btn btn--small" onClick={onRetry}>
          Спробувати ще раз
        </button>
      )}
    </div>
  );
}
