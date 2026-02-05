import { Router } from 'express';
import { authenticate, requireHubAdmin } from '../middleware/auth.js';
import { dateRangeQuerySchema, exportQuerySchema } from '../validations/report.validation.js';
import {
  getSummaryReport,
  getGroupsReport,
  getTimingReport,
  getExportData,
  convertToCSV,
} from '../services/report.service.js';

export const reportsRouter = Router();

// All routes require hub admin authentication
reportsRouter.use(authenticate);
reportsRouter.use(requireHubAdmin);

/**
 * GET /api/reports/summary
 * Get aggregate summary by category
 *
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *
 * Returns: total funds by category, count of requests
 * CRITICAL: No individual request details - aggregate data only
 */
reportsRouter.get('/summary', async (req, res) => {
  const queryParsed = dateRangeQuerySchema.safeParse(req.query);

  if (!queryParsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: queryParsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const user = req.user!;

  if (!user.hubId) {
    res.status(400).json({ error: 'User does not have an associated hub' });
    return;
  }

  const report = await getSummaryReport(user.hubId, queryParsed.data);
  res.json(report);
});

/**
 * GET /api/reports/groups
 * Get count of groups supported
 *
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *
 * Returns: number of groups that received funding
 * CRITICAL: No individual group details - aggregate counts only
 */
reportsRouter.get('/groups', async (req, res) => {
  const queryParsed = dateRangeQuerySchema.safeParse(req.query);

  if (!queryParsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: queryParsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const user = req.user!;

  if (!user.hubId) {
    res.status(400).json({ error: 'User does not have an associated hub' });
    return;
  }

  const report = await getGroupsReport(user.hubId, queryParsed.data);
  res.json(report);
});

/**
 * GET /api/reports/timing
 * Get average time to funding
 *
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *
 * Returns: average time from submission to funds_sent
 * CRITICAL: No individual request details - aggregate timing only
 */
reportsRouter.get('/timing', async (req, res) => {
  const queryParsed = dateRangeQuerySchema.safeParse(req.query);

  if (!queryParsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: queryParsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const user = req.user!;

  if (!user.hubId) {
    res.status(400).json({ error: 'User does not have an associated hub' });
    return;
  }

  const report = await getTimingReport(user.hubId, queryParsed.data);
  res.json(report);
});

/**
 * GET /api/reports/export
 * Export aggregate report as CSV or JSON
 *
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - format: 'csv' | 'json' (default: 'csv')
 *
 * CRITICAL: No individual request details, only aggregates
 */
reportsRouter.get('/export', async (req, res) => {
  const queryParsed = exportQuerySchema.safeParse(req.query);

  if (!queryParsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: queryParsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const user = req.user!;

  if (!user.hubId) {
    res.status(400).json({ error: 'User does not have an associated hub' });
    return;
  }

  const data = await getExportData(user.hubId, queryParsed.data);

  if (queryParsed.data.format === 'json') {
    res.json({ data });
    return;
  }

  // CSV export
  const csv = convertToCSV(data);
  const filename = `relay-report-${new Date().toISOString().split('T')[0]}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});
