import type { ReactNode } from 'react';
import { FORBIDDEN_MESSAGE } from '../api/errors';
import type { Role } from '../api/session';
import { useRole } from './useRole';

export function RoleGate({
  role,
  title,
  children,
}: {
  role: Role;
  title: string;
  children: ReactNode;
}) {
  const current = useRole();
  if (current !== role) {
    return (
      <div className="stack">
        <h1>{title}</h1>
        <div className="alert alert--error" role="alert">
          {FORBIDDEN_MESSAGE}
        </div>
      </div>
    );
  }
  return children;
}
