import type { RequestHandler } from 'express';

// Paths that should NOT be logged (anonymous routes)
const ANONYMOUS_PATHS = ['/api/mailbox', '/api/broadcasts', '/api/directory'];

/**
 * Request logging middleware.
 * CRITICAL: Does NOT log requests to anonymous routes (/api/mailbox/*)
 * to protect user privacy.
 */
export const requestLogger: RequestHandler = (req, _res, next) => {
  // Skip logging for anonymous routes
  const isAnonymousRoute = ANONYMOUS_PATHS.some((path) => req.path.startsWith(path));

  if (!isAnonymousRoute) {
    const timestamp = new Date().toISOString();
    const requestId = req.requestId || 'unknown';
    console.log(`[${timestamp}] [${requestId}] ${req.method} ${req.path}`);
  }

  next();
};
