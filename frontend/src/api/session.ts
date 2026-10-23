/**
 * ТИМЧАСОВА роль користувача (як і на бекенді, де роль береться із заголовка x-user-role).
 * Перемикач у шапці лише для розробки; справжня автентифікація замінить цей модуль.
 */
export type Role = 'customer' | 'manager' | 'admin';

const KEY = 'merch.role';
const listeners = new Set<() => void>();

function read(): Role {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'manager' || value === 'admin' ? value : 'customer';
  } catch {
    return 'customer';
  }
}

let current: Role = read();

export function getRole(): Role {
  return current;
}

export function setRole(role: Role): void {
  current = role;
  try {
    localStorage.setItem(KEY, role);
  } catch {
    // не критично
  }
  listeners.forEach((l) => l());
}

export function subscribeRole(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Заголовок для запиту: покупець його не надсилає. */
export function roleHeader(role: Role = current): Record<string, string> {
  return role === 'customer' ? {} : { 'x-user-role': role };
}
