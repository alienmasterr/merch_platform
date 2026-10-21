import type { RequestHandler } from 'express';

/** Мінімальний CORS для SPA на іншому порту (без залежностей). */
export function cors(allowedOrigin: string): RequestHandler {
  return (req, res, next) => {
    if (req.header('origin') === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  };
}
