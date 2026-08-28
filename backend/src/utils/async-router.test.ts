import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { asyncRouter } from './async-router.js';
import { errorHandler } from '../middleware/error-handler.js';

/**
 * Regression coverage for #21. Express 4 does not forward rejected promises from
 * async handlers, so before asyncRouter these cases sent no response at all and
 * raised an unhandledRejection that terminates the process on Node 15+.
 */
function buildApp(register: (router: ReturnType<typeof asyncRouter>) => void) {
  const router = asyncRouter();
  register(router);

  const app = express();
  app.use(express.json());
  app.use('/', router);
  app.use(errorHandler);
  return app;
}

describe('asyncRouter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routes a rejected async handler to the error handler as a 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const app = buildApp((router) => {
      router.get('/boom', async () => {
        throw new Error('database exploded');
      });
    });

    const response = await request(app).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
  });

  it('routes a synchronous throw to the error handler as a 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const app = buildApp((router) => {
      router.get('/sync-boom', () => {
        throw new Error('sync failure');
      });
    });

    const response = await request(app).get('/sync-boom');

    expect(response.status).toBe(500);
  });

  it('preserves the status code set on the error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const app = buildApp((router) => {
      router.post('/not-found', async () => {
        const err = new Error('no such thing') as Error & { statusCode: number };
        err.statusCode = 404;
        throw err;
      });
    });

    const response = await request(app).post('/not-found');

    expect(response.status).toBe(404);
  });

  it('leaves successful handlers untouched', async () => {
    const app = buildApp((router) => {
      router.get('/fine', async (_req, res) => {
        res.status(200).json({ ok: true });
      });
    });

    const response = await request(app).get('/fine');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('runs middleware chains in order and still catches a later rejection', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const seen: string[] = [];

    const app = buildApp((router) => {
      router.get(
        '/chain',
        async (_req, _res, next) => {
          seen.push('first');
          next();
        },
        async () => {
          seen.push('second');
          throw new Error('late failure');
        }
      );
    });

    const response = await request(app).get('/chain');

    expect(seen).toEqual(['first', 'second']);
    expect(response.status).toBe(500);
  });

  it('catches rejections from handlers registered via router.route()', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const app = buildApp((router) => {
      router.route('/grouped').get(async () => {
        throw new Error('route() failure');
      });
    });

    const response = await request(app).get('/grouped');

    expect(response.status).toBe(500);
  });

  it('converts a falsy rejection into a real error instead of continuing the chain', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const app = buildApp((router) => {
      router.get('/falsy', async () => {
        throw undefined;
      });
    });

    const response = await request(app).get('/falsy');

    // next(undefined) would read as "no error" and fall through to the 404
    // handler, reporting Not found for what was actually a failure.
    expect(response.status).toBe(500);
  });

  it('catches rejections from non-native thenables', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const app = buildApp((router) => {
      router.get('/thenable', () => ({
        then: (_resolve: unknown, reject: (reason: unknown) => void) => {
          reject(new Error('thenable failure'));
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any;
    });

    const response = await request(app).get('/thenable');

    expect(response.status).toBe(500);
  });

  it('does not swallow an error handler registered on the router', async () => {
    const app = buildApp((router) => {
      router.get('/handled', async () => {
        throw new Error('handled locally');
      });

      // Four arguments, so Express must still recognise this as error middleware
      // rather than a request handler.
      router.use(
        (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
          res.status(418).json({ handled: err.message });
        }
      );
    });

    const response = await request(app).get('/handled');

    expect(response.status).toBe(418);
    expect(response.body.handled).toBe('handled locally');
  });
});
