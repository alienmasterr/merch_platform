const KEY = 'merch.orders.v1';
const LIMIT = 10;

export function loadRecentOrders(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw)
      ? raw.filter((id): id is string => typeof id === 'string').slice(0, LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function rememberOrder(id: string): void {
  try {
    const ids = [id, ...loadRecentOrders().filter((x) => x !== id)].slice(0, LIMIT);
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
  }
}
