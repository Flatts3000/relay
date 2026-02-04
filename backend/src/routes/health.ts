import { Router } from 'express';

export const healthRouter = Router();

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
