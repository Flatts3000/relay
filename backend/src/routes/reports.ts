import { Router } from 'express';
import { authenticate, requireHubAdmin } from '../middleware/auth.js';

export const reportsRouter = Router();

// All routes require hub admin authentication
reportsRouter.use(authenticate);
reportsRouter.use(requireHubAdmin);

/**
 * GET /api/reports/summary
 * Get aggregate summary by category
 * Returns: total funds by category, count of requests
 */
reportsRouter.get('/summary', async (_req, res) => {
  // TODO: Implement summary report
  // Query params: startDate, endDate
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * GET /api/reports/groups
 * Get count of groups supported
 * Returns: number of groups that received funding
 */
reportsRouter.get('/groups', async (_req, res) => {
  // TODO: Implement groups count report
  // Query params: startDate, endDate
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * GET /api/reports/timing
 * Get average time to funding
 * Returns: average time from submission to funds_sent
 */
reportsRouter.get('/timing', async (_req, res) => {
  // TODO: Implement timing report
  // Query params: startDate, endDate
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * GET /api/reports/export
 * Export aggregate report as CSV
 * CRITICAL: No individual request details, only aggregates
 */
reportsRouter.get('/export', async (_req, res) => {
  // TODO: Implement CSV export
  // Query params: startDate, endDate, format (csv/json)
  res.status(501).json({ error: 'Not implemented' });
});
