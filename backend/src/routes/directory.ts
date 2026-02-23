import { Router } from 'express';
import { getDirectoryEntries, getPublicDirectoryEntries } from '../services/directory.service.js';

export const directoryRouter = Router();

/**
 * GET /api/directory
 * Public, anonymous directory of groups that can receive broadcasts.
 * Returns verified groups with public keys set.
 *
 * Query params:
 *   - region (optional): filter by broadcastServiceArea
 *   - categories (optional): comma-separated broadcast category list
 *
 * CRITICAL: No authentication, no cookies, no IP logging, no audit.
 */
directoryRouter.get('/', async (req, res) => {
  const region = typeof req.query['region'] === 'string' ? req.query['region'] : undefined;
  const categoriesParam =
    typeof req.query['categories'] === 'string' ? req.query['categories'] : undefined;
  const categories = categoriesParam ? categoriesParam.split(',').map((c) => c.trim()) : undefined;

  const entries = await getDirectoryEntries(region, categories);
  res.json({ entries });
});

/**
 * GET /api/directory/groups
 * Public directory of verified mutual aid groups.
 * Browsable by anyone without authentication.
 *
 * Query params:
 *   - search (optional): filter by name or service area
 *   - category (optional): filter by aid category
 *
 * CRITICAL: No authentication, no cookies, no IP logging, no audit.
 */
const VALID_AID_CATEGORIES = new Set(['rent', 'food', 'utilities', 'other']);

directoryRouter.get('/groups', async (req, res) => {
  const rawSearch =
    typeof req.query['search'] === 'string' ? req.query['search'].trim() : undefined;
  const rawCategory = typeof req.query['category'] === 'string' ? req.query['category'] : undefined;

  // Validate search length (prevent abuse)
  const search =
    rawSearch && rawSearch.length > 0 && rawSearch.length <= 200 ? rawSearch : undefined;

  // Validate category against allowed enum values
  const category = rawCategory && VALID_AID_CATEGORIES.has(rawCategory) ? rawCategory : undefined;

  const entries = await getPublicDirectoryEntries(search, category);
  res.json({ entries, total: entries.length });
});
