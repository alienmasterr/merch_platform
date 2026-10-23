import { useEffect, useState } from 'react';

/** Значення, що оновлюється лише після паузи `delayMs` (для полів введення, які ходять в API). */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
