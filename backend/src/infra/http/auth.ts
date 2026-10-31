import type { RequestHandler } from 'express';

export function requireRole(role: 'admin' | 'manager'): RequestHandler {
  return (req, res, next) => {
    if (req.header('x-user-role') !== role) {
      res.status(403).json({ error: 'FORBIDDEN', message: `Role "${role}" is required` });
      return;
    }
    next();
  };
}
