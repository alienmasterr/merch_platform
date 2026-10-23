import { useQueryClient } from '@tanstack/react-query';
import { setRole, type Role } from '../api/session';
import { useRole } from './useRole';

const LABELS: Record<Role, string> = {
  customer: 'Покупець',
  manager: 'Менеджер',
  admin: 'Адміністратор',
};

/** Dev-перемикач ролі (заголовок x-user-role), поки немає справжньої автентифікації. */
export function RoleSwitcher() {
  const role = useRole();
  const queryClient = useQueryClient();
  return (
    <label
      className="row small role-switcher"
      title="Тимчасово: роль передається бекенду в заголовку x-user-role"
    >
      Роль
      <select
        value={role}
        onChange={(e) => {
          setRole(e.target.value as Role);
          // дані, отримані з іншою роллю (зокрема 403), більше не актуальні
          void queryClient.invalidateQueries();
        }}
      >
        {(Object.keys(LABELS) as Role[]).map((r) => (
          <option key={r} value={r}>
            {LABELS[r]}
          </option>
        ))}
      </select>
    </label>
  );
}
