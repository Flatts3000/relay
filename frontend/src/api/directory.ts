/**
 * Directory API client for fetching groups that can receive broadcasts.
 * CRITICAL: This is an anonymous endpoint. No authentication, no cookies.
 */

import type { DirectoryEntry, PublicDirectoryEntry } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Fetch directory entries (verified groups with broadcast public keys).
 * Optionally filtered by region and/or categories.
 */
export async function fetchDirectory(
  region?: string,
  categories?: string[]
): Promise<DirectoryEntry[]> {
  const params = new URLSearchParams();
  if (region) params.set('region', region);
  if (categories && categories.length > 0) params.set('categories', categories.join(','));

  const queryString = params.toString();
  const url = `${API_BASE}/api/directory${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    // No credentials — anonymous route
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch directory');
  }

  const data = await response.json();
  return data.entries;
}

/**
 * Fetch public directory of verified mutual aid groups.
 * Optionally filtered by search term (name/area) and/or aid category.
 */
export async function fetchPublicDirectory(
  search?: string,
  category?: string
): Promise<PublicDirectoryEntry[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);

  const queryString = params.toString();
  const url = `${API_BASE}/api/directory/groups${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    // No credentials — anonymous route
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch directory');
  }

  const data = await response.json();
  return data.entries;
}
