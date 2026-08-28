import { asyncRouter } from '../utils/async-router.js';

export const healthRouter = asyncRouter();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/ready', (_req, res) => {
  // TODO: Add database connectivity check
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});
