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
  }
  listeners.forEach((l) => l());
}

export function subscribeRole(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function roleHeader(role: Role = current): Record<string, string> {
  return role === 'customer' ? {} : { 'x-user-role': role };
}
