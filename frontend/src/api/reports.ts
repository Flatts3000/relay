/**
 * Reports API client for hub admins.
 * All endpoints return aggregate data only - no individual request details.
 */

import type { DateRangeQuery, SummaryReport, GroupsReport, TimingReport } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('sessionToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function buildQueryString(query?: DateRangeQuery): string {
  if (!query) return '';

  const params = new URLSearchParams();
  if (query.startDate) params.append('startDate', query.startDate);
  if (query.endDate) params.append('endDate', query.endDate);

  return params.toString() ? `?${params}` : '';
}

/**
 * Get summary report with totals and breakdown by category.
 */
export async function getSummaryReport(query?: DateRangeQuery): Promise<SummaryReport> {
  const url = `${API_BASE}/api/reports/summary${buildQueryString(query)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to load summary report' }));
    throw new Error(error.error || 'Failed to load summary report');
  }

  return response.json();
}

/**
 * Get groups report - count of groups supported.
 */
export async function getGroupsReport(query?: DateRangeQuery): Promise<GroupsReport> {
  const url = `${API_BASE}/api/reports/groups${buildQueryString(query)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to load groups report' }));
    throw new Error(error.error || 'Failed to load groups report');
  }

  return response.json();
}

/**
 * Get timing report - average time to funding.
 */
export async function getTimingReport(query?: DateRangeQuery): Promise<TimingReport> {
  const url = `${API_BASE}/api/reports/timing${buildQueryString(query)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to load timing report' }));
    throw new Error(error.error || 'Failed to load timing report');
  }

  return response.json();
}

/**
 * Export report as CSV.
 * Returns the CSV file as a Blob for download.
 */
export async function exportReportCSV(query?: DateRangeQuery): Promise<Blob> {
  const params = new URLSearchParams();
  if (query?.startDate) params.append('startDate', query.startDate);
  if (query?.endDate) params.append('endDate', query.endDate);
  params.append('format', 'csv');

  const url = `${API_BASE}/api/reports/export?${params}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to export report' }));
    throw new Error(error.error || 'Failed to export report');
  }

  return response.blob();
}

/**
 * Trigger download of a blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
