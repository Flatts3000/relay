import { get } from './client';
import type { DashboardSummary } from './types';

/**
 * Get group coordinator dashboard summary.
 * Requires authentication as a group coordinator.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return get<DashboardSummary>('/api/groups/me/dashboard');
}
