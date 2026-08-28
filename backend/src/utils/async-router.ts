import { Router, type RequestHandler, type IRouter } from 'express';

/**
 * Express 4 does not forward rejected promises from async handlers to the error
 * middleware. A handler that rejects therefore never reaches `errorHandler`, never
 * sends a response, and surfaces as an `unhandledRejection` - which terminates the
 * process by default on Node 15 and above. Every route in this codebase is async,
 * so any database error was a process-terminating event rather than a 500.
 *
 * This wraps a router's verb methods so each handler's rejection is passed to
 * `next()`. Preferred over the usual `express-async-errors` package, which has not
 * been published since 2022 and patches Express internals; this is a few lines we
 * own, exercised by the tests in async-router.test.ts.
 *
 * Express 5 forwards async rejections natively, at which point this can be removed.
 */

const VERBS = ['get', 'post', 'put', 'patch', 'delete', 'all', 'use'] as const;

/**
 * Error-handling middleware is identified by arity: Express only treats a
 * four-argument function as an error handler, so those must pass through
 * untouched or they stop being recognised as such.
 */
function wrapHandler(handler: unknown): unknown {
  if (typeof handler !== 'function' || handler.length >= 4) {
    return handler;
  }

  const original = handler as RequestHandler;

  const wrapped: RequestHandler = (req, res, next) => {
    try {
      const result = original(req, res, next) as unknown;
      if (result instanceof Promise) {
        result.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };

  // Preserve arity so anything downstream that inspects it still sees a
  // request handler rather than an error handler.
  Object.defineProperty(wrapped, 'length', { value: Math.min(original.length, 3) });

  return wrapped;
}

/**
 * A Router whose handlers forward async rejections to the error middleware.
 * Drop-in replacement for `Router()`.
 */
export function asyncRouter(): IRouter {
  const router = Router();

  for (const verb of VERBS) {
    const original = router[verb].bind(router) as (...args: unknown[]) => IRouter;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (router as any)[verb] = (...args: unknown[]): IRouter =>
      original(
        ...args.map((arg) => (Array.isArray(arg) ? arg.map(wrapHandler) : wrapHandler(arg)))
      );
  }

  return router;
}
