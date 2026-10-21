import type { RequestHandler } from 'express';

/**
 * ТИМЧАСОВА заглушка авторизації: роль береться із заголовка x-user-role.
 * Ставить лише для розробки. Перед "продакшном" замінити на справжню автентифікацію (JWT/сесії).
 */
export function requireRole(role: 'admin' | 'manager'): RequestHandler {
  return (req, res, next) => {
    if (req.header('x-user-role') !== role) {
      res.status(403).json({ error: 'FORBIDDEN', message: `Role "${role}" is required` });
      return;
    }
    next();
  };
}
