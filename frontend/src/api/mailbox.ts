/**
 * Anonymous mailbox API client.
 * CRITICAL: These endpoints do NOT require authentication.
 * No cookies, no tracking, no identifying information is sent.
 */

import type { Mailbox, CreateMailboxInput, CreateMailboxResponse } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Create a new anonymous mailbox.
 * CRITICAL: No authentication, no cookies, no tracking.
 */
export async function createMailbox(input: CreateMailboxInput): Promise<CreateMailboxResponse> {
  const response = await fetch(`${API_BASE}/api/mailbox`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // CRITICAL: No credentials to prevent any cookie tracking
    credentials: 'omit',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create mailbox' }));
    throw new Error(error.error || 'Failed to create mailbox');
  }

  return response.json();
}

/**
 * Get mailbox with encrypted messages.
 * CRITICAL: No authentication, no cookies, no tracking.
 * Side effect: Updates last_accessed_at timestamp on the server.
 */
export async function getMailbox(mailboxId: string): Promise<Mailbox> {
  const response = await fetch(`${API_BASE}/api/mailbox/${mailboxId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'omit',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to load mailbox' }));
    throw new Error(error.error || 'Failed to load mailbox');
  }

  return response.json();
}

/**
 * Delete a mailbox (manual deletion by user).
 * CRITICAL: No authentication, no cookies, no tracking.
 * This is a destructive operation with no recovery.
 */
export async function deleteMailbox(mailboxId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/mailbox/${mailboxId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'omit',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete mailbox' }));
    throw new Error(error.error || 'Failed to delete mailbox');
  }
}
