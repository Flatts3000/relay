import type { ErrorRequestHandler } from 'express';
import { config } from '../config.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode ?? 500;
  const message = config.nodeEnv === 'production' ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack }),
  });
};
