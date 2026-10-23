import { useSyncExternalStore } from 'react';
import { getRole, subscribeRole, type Role } from '../api/session';

export function useRole(): Role {
  return useSyncExternalStore(subscribeRole, getRole);
}
