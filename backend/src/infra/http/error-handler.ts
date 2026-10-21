import type { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { ConflictError, ExternalServiceError, NotFoundError, ValidationError } from '@merch/contracts';

// Express розпізнає error-middleware за 4 аргументами, тому _next має лишитись у сигнатурі.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid request', details: err.issues });
    return;
  }
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.code, message: err.message });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.code, message: err.message });
    return;
  }
  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.code, message: err.message });
    return;
  }
  if (err instanceof ExternalServiceError) {
    res.status(502).json({ error: err.code, message: err.message });
    return;
  }
  if (err instanceof MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    res.status(status).json({ error: 'UPLOAD_ERROR', message: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
};
