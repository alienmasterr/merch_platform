import type { OrderStatus } from '@merch/contracts';
import { buildTimeline, statusHint } from './status';

export function StatusTimeline({ status }: { status: OrderStatus }) {
  return (
    <div className="stack">
      {status === 'CANCELLED' && <p className="alert alert--error">Замовлення скасовано</p>}
      <ol className="timeline" aria-label="Статус замовлення">
        {buildTimeline(status).map((step) => (
          <li
            key={step.status}
            className={`timeline__step timeline__step--${step.state}`}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            <span className="timeline__dot" aria-hidden="true" />
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
      <p className="muted">{statusHint(status)}</p>
    </div>
  );
}
