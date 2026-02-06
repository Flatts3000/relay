/**
 * Help requests API client for group coordinators.
 * These endpoints require authentication.
 */

import type {
  HelpRequestsListResponse,
  ListHelpRequestsQuery,
  PublicKeyResponse,
  SendReplyInput,
  SendReplyResponse,
  TombstonesListResponse,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('sessionToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * List open help requests matching the group's service area.
 */
export async function getHelpRequests(
  query?: ListHelpRequestsQuery
): Promise<HelpRequestsListResponse> {
  const params = new URLSearchParams();
  if (query?.category) params.append('category', query.category);

  const url = `${API_BASE}/api/help-requests${params.toString() ? `?${params}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to load help requests' }));
    throw new Error(error.error || 'Failed to load help requests');
  }

  return response.json();
}

/**
 * Get the public key for a specific mailbox (for encrypting replies).
 */
export async function getMailboxPublicKey(mailboxId: string): Promise<PublicKeyResponse> {
  const response = await fetch(`${API_BASE}/api/help-requests/${mailboxId}/public-key`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get public key' }));
    throw new Error(error.error || 'Failed to get public key');
  }

  return response.json();
}

/**
 * Send an encrypted reply to a mailbox.
 * CRITICAL: Message must be encrypted client-side before calling this.
 */
export async function sendReply(
  mailboxId: string,
  input: SendReplyInput
): Promise<SendReplyResponse> {
  const response = await fetch(`${API_BASE}/api/help-requests/${mailboxId}/reply`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to send reply' }));
    throw new Error(error.error || 'Failed to send reply');
  }

  return response.json();
}

/**
 * Get tombstones for mailboxes this group responded to.
 */
export async function getTombstones(): Promise<TombstonesListResponse> {
  const response = await fetch(`${API_BASE}/api/help-requests/tombstones`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to load tombstones' }));
    throw new Error(error.error || 'Failed to load tombstones');
  }

  return response.json();
}
