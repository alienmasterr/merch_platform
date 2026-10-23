import { describe, expect, it } from 'vitest';
import { buildTimeline, isFinalStatus, pollInterval, statusHint, trackingUrl } from './status';

const states = (status: Parameters<typeof buildTimeline>[0]) =>
  buildTimeline(status).map((s) => s.state);

describe('buildTimeline', () => {
  it('marks the current step and everything before it', () => {
    expect(states('CREATED')).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    expect(states('PENDING_REVIEW')).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming']);
  });

  it('shows a shipped order as fully done', () => {
    expect(states('SHIPPED')).toEqual(['done', 'done', 'done', 'done', 'done']);
  });

  it('does not mark progress for a cancelled order', () => {
    expect(states('CANCELLED').every((s) => s === 'upcoming')).toBe(true);
  });

  it('uses Ukrainian labels', () => {
    expect(buildTimeline('CREATED').map((s) => s.label)).toEqual([
      'Створено',
      'Оплачено',
      'Перевірка макета',
      'У друці',
      'Відправлено',
    ]);
  });
});

describe('polling', () => {
  it('stops on final statuses', () => {
    expect(isFinalStatus('SHIPPED')).toBe(true);
    expect(isFinalStatus('CANCELLED')).toBe(true);
    expect(isFinalStatus('PRINTING')).toBe(false);
    expect(pollInterval('CANCELLED')).toBe(false);
    expect(pollInterval('CREATED', 1000)).toBe(1000);
    expect(pollInterval(undefined)).toBe(5000);
  });
});

describe('texts', () => {
  it('explains each status', () => {
    expect(statusHint('PENDING_REVIEW')).toMatch(/перевіряє макет/);
    expect(statusHint('CANCELLED')).toMatch(/повернуться/);
  });

  it('builds a Nova Poshta tracking link', () => {
    expect(trackingUrl('DEV-123')).toBe('https://novaposhta.ua/tracking/?cargo_number=DEV-123');
  });
});
