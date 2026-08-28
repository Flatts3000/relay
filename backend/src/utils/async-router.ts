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
 * Express treats `next(falsy)` as "no error, carry on", so a handler that
 * rejects with `undefined` or `null` would fall through to the 404 handler and
 * return a misleading "Not found" with nothing logged. Substitute a real error.
 */
function toError(reason: unknown): Error {
  return reason instanceof Error
    ? reason
    : new Error(`Route handler rejected with a non-error value: ${String(reason)}`);
}

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

      // Duck-typed rather than `instanceof Promise`, so thenables that are not
      // native promises - a query builder returned directly, a promise from
      // another realm - are still caught.
      if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
        (result as PromiseLike<unknown>).then(undefined, (err: unknown) => next(toError(err)));
      }
    } catch (err) {
      next(toError(err));
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
function wrapArgs(args: unknown[]): unknown[] {
  return args.map((arg) => (Array.isArray(arg) ? arg.map(wrapHandler) : wrapHandler(arg)));
}

/** Patch the verb methods of a router or a route in place. */
function patchVerbs<T extends object>(target: T): T {
  for (const verb of VERBS) {
    const existing = (target as Record<string, unknown>)[verb];
    if (typeof existing !== 'function') continue;

    const original = (existing as (...args: unknown[]) => unknown).bind(target);
    (target as Record<string, unknown>)[verb] = (...args: unknown[]): unknown =>
      original(...wrapArgs(args));
  }
  return target;
}

/**
 * A Router whose handlers forward async rejections to the error middleware.
 * Drop-in replacement for `Router()`.
 */
export function asyncRouter(): IRouter {
  const router = patchVerbs(Router());

  // router.route() returns a fresh Route object with its own verb methods. Left
  // alone it would hand back an unpatched Route and silently reintroduce the
  // bug, which is a nasty trap given Express's own docs recommend route() for
  // grouping verbs on a path.
  const originalRoute = router.route.bind(router);
  router.route = (path: Parameters<IRouter['route']>[0]) => patchVerbs(originalRoute(path));

  return router;
}
