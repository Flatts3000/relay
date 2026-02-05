import type { RequestHandler } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request type to include requestId
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Middleware that generates a unique request ID for each request.
 * The ID is:
 * 1. Added to req.requestId for use in logging/tracing
 * 2. Added to response headers as X-Request-Id
 *
 * If the client sends an X-Request-Id header, it will be used instead
 * (useful for distributed tracing).
 */
export const requestId: RequestHandler = (req, res, next) => {
  // Use client-provided ID if present (for distributed tracing), otherwise generate
  const id = (req.headers['x-request-id'] as string) || randomUUID();

  req.requestId = id;
  res.setHeader('X-Request-Id', id);

  next();
};
