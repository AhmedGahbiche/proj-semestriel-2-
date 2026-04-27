import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    ok: false,
    error: {
      message: statusCode >= 500 ? 'Internal Server Error' : String(err?.message ?? 'Request failed')
    }
  });
};
